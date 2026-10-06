import { Body, Controller, HttpStatus, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './dto/registerUser.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import {
  LoginResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'user login',
    description:
      'Login to your account with your credentials. Former staff (terminated/resigned/retired) get 403.',
  })
  @ApiEnvelope(LoginResponseDto, { message: 'User logged in successful' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
  )
  async login(@Body() loginUserDto: LoginDto) {
    return this.authService.loginUser(loginUserDto);
  }

  @Post('access-token/refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Redeems a refresh token for a new access/refresh pair. The presented token is revoked; presenting it again revokes every token for that user.',
  })
  @ApiEnvelope(TokenPairResponseDto, { message: 'Tokens refreshed' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
  )
  async refreshAccessToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Auth()
  @Patch('password')
  @ApiOperation({
    summary: 'Change your password',
    description:
      'Requires the current password. Revokes every refresh token, so other sessions must log in again.',
  })
  @ApiEnvelope(null, { message: 'Password changed successfully' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async changePassword(
    @CurrentUser('sub') userId: number,
    @Body() data: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      data.currentPassword,
      data.newPassword,
    );
    return null;
  }

  @Post('password/forgot')
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Emails a one-time link to WEB_APP_URL/reset-password?token=…. The response is the same whether or not the email has an account.',
  })
  @ApiEnvelope(null, {
    message: 'If an account exists for that email, a reset link has been sent',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.email);
    return null;
  }

  @Post('password/reset')
  @ApiOperation({
    summary: 'Set a new password with an emailed link',
    description:
      'Redeems a reset or new-account link (one use). Revokes every refresh token.',
  })
  @ApiEnvelope(null, { message: 'Password has been set' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return null;
  }

  @Auth()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout everywhere',
    description: 'Revokes all refresh tokens for the current user',
  })
  @ApiEnvelope(null, { message: 'Logged out successfully' })
  async logout(@CurrentUser('sub') userId: number) {
    await this.authService.logout(userId);
    return null;
  }
}
