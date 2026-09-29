import { Body, Controller, HttpStatus, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/registerUser.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import {
  LoginResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto.js';
import { UserResponseDto } from '../user/dto/user-response.dto.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Auth()
  @Roles(UserRole.Admin, UserRole.Hr)
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Admin/HR create a user account (role: employee). The user should change the initial password via PATCH /auth/password.',
  })
  @ApiEnvelope(UserResponseDto, { message: 'User registered successfully' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async register(@Body() registerUserDto: RegisterDto) {
    return this.authService.registerUser(registerUserDto);
  }

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
