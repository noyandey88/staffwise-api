import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { UserProfileResponseDto } from './dto/user-profile-response.dto.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Auth()
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the current user',
    description:
      'Returns the authenticated user with their employee record (department, job title, manager, status), or employee: null if they have none.',
  })
  @ApiEnvelope(UserProfileResponseDto, { message: 'Data loaded successfully' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async getUserProfile(@CurrentUser('sub') userId: number) {
    return this.userService.getProfile(userId);
  }
}
