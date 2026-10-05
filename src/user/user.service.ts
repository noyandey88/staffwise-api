import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from '../auth/dto/registerUser.dto.js';
import { UserRepository } from './user.repository.js';
import bcrypt from 'bcrypt';
import { UserRole } from './user.types.js';
import { UserListQueryDto } from './dto/user-list-query.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  /** Without the password hash; undefined when no user has that email. */
  async findByEmailOptional(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return undefined;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  /** Sets a password without checking the old one (reset/setup links). */
  async setPassword(id: number, newPassword: string) {
    await this.userRepository.updatePassword(
      id,
      await bcrypt.hash(newPassword, 10),
    );
  }

  async createUser(registerUserDto: RegisterDto & { password: string }) {
    const existing = await this.userRepository.findByEmail(
      registerUserDto.email,
    );

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.userRepository.createUser(registerUserDto);
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Verifies credentials. Unknown email and wrong password both yield the
   * same 401 so the endpoint cannot be used to enumerate accounts.
   */
  async findUser(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmail(loginDto.email);
    const isPasswordMatched = user
      ? await bcrypt.compare(loginDto.password, user.password)
      : false;

    if (!user || !isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async findUserById(id: number) {
    const user = await this.userRepository.findById(id);

    if (user) {
      const { password: _password, ...safeUser } = user;
      return safeUser;
    }

    throw new NotFoundException('User not found');
  }

  async getProfile(id: number) {
    const profile = await this.userRepository.findProfile(id);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return profile;
  }

  /**
   * Former staff (terminated/resigned/retired) cannot sign in. Users without
   * an employee record (e.g. a bootstrap admin) are unaffected.
   */
  async assertCanSignIn(user: { id: number; role: UserRole }) {
    // The super admin must never be locked out by HR data.
    if (user.role === UserRole.SuperAdmin) return;

    const status = await this.userRepository.findEmploymentStatus(user.id);

    if (status && SIGN_IN_BLOCKED_STATUSES.includes(status)) {
      throw new ForbiddenException('This account has been deactivated');
    }
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepository.updatePassword(
      id,
      await bcrypt.hash(newPassword, 10),
    );
  }

  async findPage(query: UserListQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.userRepository.findPage(
      {
        search: query.search?.trim() || undefined,
        role: query.role,
        unlinked: query.unlinked,
      },
      window,
    );
    return paginated(items, total, window);
  }

  /**
   * Admins cannot change their own role, so the last admin can never
   * demote themselves and lock everyone out of role management.
   */
  async updateRole(actorId: number, targetId: number, role: UserRole) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const target = await this.userRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === UserRole.SuperAdmin) {
      throw new ForbiddenException("The super admin's role cannot be changed");
    }

    const user = (await this.userRepository.updateRole(targetId, role))!;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
