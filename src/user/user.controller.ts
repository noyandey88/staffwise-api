import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserProfileResponseDto } from './dto/user-profile-response.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UserRole } from './user.types.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

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

  @Get('/get/all')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'List all users',
    description: 'Used by admin/HR to find the user to link to an employee.',
  })
  @ApiEnvelope(UserResponseDto, {
    message: 'Users retrieved successfully',
    isArray: true,
  })
  async findAll() {
    return await this.userService.findAll();
  }

  @Patch('/:id/role')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Change a user's role",
    description:
      'Admins cannot change their own role. The new role applies once the user logs in or refreshes their token.',
  })
  @ApiEnvelope(UserResponseDto, { message: 'Role updated successfully' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async updateRole(
    @CurrentUser('sub') actorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateUserRoleDto,
  ) {
    return await this.userService.updateRole(actorId, id, data.role);
  }
}
