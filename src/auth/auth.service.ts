import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service.js';
import { RegisterDto, LoginDto } from './dto/registerUser.dto.js';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '../user/user.types.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import { NotificationService } from '../mail/notification.service.js';
import { AuditService } from '../audit/audit.service.js';

/** A user may request a new reset link at most this often. */
const RESET_REQUEST_COOLDOWN_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Without a password the account gets an unguessable one, so the only
   * way in is the emailed set-password link.
   */
  async registerUser(registerUserDto: RegisterDto) {
    const hash = await bcrypt.hash(
      registerUserDto.password ?? randomBytes(32).toString('hex'),
      10,
    );
    const user = await this.userService.createUser({
      ...registerUserDto,
      password: hash,
    });

    await this.audit.record({
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      after: user,
    });
    const token = await this.issuePasswordToken(user.id, 'setup');
    this.notifications.accountCreated(user, token);
    return user;
  }

  /**
   * Always resolves the same way, whether or not the email belongs to an
   * account, so it can't be used to discover who has one.
   */
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmailOptional(email);
    if (!user) return;
    try {
      await this.userService.assertCanSignIn(user);
    } catch {
      return; // former staff get no link
    }

    const latest = await this.passwordResetRepository.latestForUser(user.id);
    if (
      latest &&
      !latest.usedAt &&
      Date.now() - latest.createdAt.getTime() < RESET_REQUEST_COOLDOWN_MS
    ) {
      return; // a link was just sent; don't flood their inbox
    }

    const token = await this.issuePasswordToken(user.id, 'reset');
    try {
      await this.notifications.sendPasswordReset(user, token);
    } catch (err) {
      // Same response either way; the failure is for operators.
      this.logger.error(
        { err, userId: user.id },
        'Password reset email failed',
      );
    }
  }

  /** Redeems a reset/setup link; every session is signed out. */
  async resetPassword(rawToken: string, newPassword: string) {
    const userId = await this.passwordResetRepository.consume(
      this.hashToken(rawToken),
    );
    if (!userId) {
      throw new BadRequestException('This link is invalid or has expired');
    }
    const user = await this.userService.findUserById(userId);
    await this.userService.assertCanSignIn(user);

    await this.userService.setPassword(userId, newPassword);
    await this.refreshTokenRepository.revokeAllForUser(userId);
    await this.audit.record({
      action: 'user.password_reset',
      entityType: 'user',
      entityId: userId,
    });
  }

  private async issuePasswordToken(userId: number, purpose: 'reset' | 'setup') {
    const raw = randomBytes(32).toString('base64url');
    const seconds = this.configService.get<number>(
      purpose === 'reset'
        ? 'PASSWORD_RESET_EXPIRES_IN'
        : 'ACCOUNT_SETUP_EXPIRES_IN',
    )!;
    await this.passwordResetRepository.issue(
      userId,
      this.hashToken(raw),
      purpose,
      new Date(Date.now() + seconds * 1000),
    );
    return raw;
  }

  async loginUser(loginDto: LoginDto) {
    const user = await this.userService.findUser(loginDto);
    await this.userService.assertCanSignIn(user);

    // Cheap, bounded housekeeping: every login sheds this user's dead rows
    // so the table never accumulates unbounded revoked/expired tokens.
    await this.refreshTokenRepository.deleteStaleForUser(user.id);

    const tokens = await this.issueTokenPair(user.id, user.email, user.role);

    return { ...tokens, user };
  }

  /**
   * Redeems a refresh token: the presented token is revoked and a new
   * access/refresh pair is issued. Presenting an already-revoked token
   * is treated as theft and revokes every token the user holds.
   */
  async refreshAccessToken(rawRefreshToken: string) {
    const stored = await this.refreshTokenRepository.findByHash(
      this.hashToken(rawRefreshToken),
    );

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Refresh token reused');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokenRepository.revokeToken(stored.id);

    const user = await this.userService.findUserById(stored.userId);

    try {
      await this.userService.assertCanSignIn(user);
    } catch (err) {
      // Deactivated since this token was issued: end every session.
      await this.refreshTokenRepository.revokeAllForUser(user.id);
      throw err;
    }

    return this.issueTokenPair(user.id, user.email, user.role);
  }

  /** Changing the password signs the user out of every session. */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    await this.userService.changePassword(userId, currentPassword, newPassword);
    await this.refreshTokenRepository.revokeAllForUser(userId);
    await this.audit.record({
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
    });
  }

  async logout(userId: number) {
    return await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  private async issueTokenPair(userId: number, email: string, role: UserRole) {
    const [access, refresh] = await Promise.all([
      this.issueAccessToken(userId, email, role),
      this.issueRefreshToken(userId),
    ]);

    return {
      accessToken: access.accessToken,
      refreshToken: refresh.refreshToken,
      accessTokenExpiresIn: access.expiresIn,
      refreshTokenExpiresIn: refresh.expiresIn,
    };
  }

  private async issueAccessToken(
    userId: number,
    email: string,
    role: UserRole,
  ) {
    const payload = { sub: userId, email: email, role: role };
    const token = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRES_IN')!;

    return {
      accessToken: token,
      expiresIn,
    };
  }

  private async issueRefreshToken(userId: number) {
    const rawRefreshToken = randomBytes(64).toString('hex');
    const expiresIn = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN')!;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.refreshTokenRepository.create({
      userId,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt,
    });

    return {
      refreshToken: rawRefreshToken,
      expiresIn,
    };
  }

  /**
   * Refresh (64 bytes) and password (32 bytes) tokens are random, so a fast unsalted digest is safe
   * (nothing to brute-force) and gives an indexable, deterministic key.
   * bcrypt would force a linear scan with a slow compare per row.
   */
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
