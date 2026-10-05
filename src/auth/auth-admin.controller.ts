import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/registerUser.dto.js';
import { UserResponseDto } from '../user/dto/user-response.dto.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@ApiTags('Admin · Users')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('admin')
export class AuthAdminController {
  constructor(private readonly authService: AuthService) {}

  @Auth()
  @Roles(UserRole.Admin, UserRole.Hr)
  @Post('users')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Admin/HR create a user account (role: employee). The user is emailed a link to set their own password; the optional password is only an initial one.',
  })
  @ApiEnvelope(UserResponseDto, { message: 'User registered successfully' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async register(@Body() registerUserDto: RegisterDto) {
    return this.authService.registerUser(registerUserDto);
  }
}
