import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { WorkModeService } from './work-mode.service.js';
import { RemoteWorkService } from './remote-work.service.js';
import {
  CreateRemoteWorkRequestDto,
  RemoteWorkQueryDto,
  RemoteWorkResponseDto,
} from './dto/remote-work.dto.js';
import {
  ResolvedArrangementQueryDto,
  ResolvedArrangementResponseDto,
} from './dto/work-arrangement.dto.js';

@Auth()
@ApiTags('Work modes')
@Controller()
export class WorkModeController {
  constructor(
    private readonly service: WorkModeService,
    private readonly remoteWork: RemoteWorkService,
  ) {}

  @Get('/employees/me/work-arrangement')
  @ApiOperation({
    summary: 'My work arrangement',
    description:
      'Mode in force on the date, where it comes from, and whether that day is an office day.',
  })
  @ApiEnvelope(ResolvedArrangementResponseDto, {
    message: 'Work arrangement retrieved',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  mine(
    @CurrentUser('sub') userId: number,
    @Query() query: ResolvedArrangementQueryDto,
  ) {
    return this.service.mine(userId, query.date);
  }

  @Get('/employees/:id/work-arrangement')
  @ApiOperation({
    summary: "An employee's work arrangement",
    description: 'Admin/HR, the employee, or their managers.',
  })
  @ApiEnvelope(ResolvedArrangementResponseDto, {
    message: 'Work arrangement retrieved',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  forEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ResolvedArrangementQueryDto,
  ) {
    return this.service.forEmployee(user, id, query.date);
  }

  // --- remote-work requests ---

  @Post('/remote-work/requests')
  @ApiOperation({
    summary: 'Request to work remotely',
    description:
      'For days your arrangement expects the office (up to 31 days, not in the past). ' +
      'Your manager or HR approves.',
  })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work request submitted',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  requestRemote(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateRemoteWorkRequestDto,
  ) {
    return this.remoteWork.request(userId, dto);
  }

  @Get('/remote-work/requests/me')
  @ApiOperation({ summary: 'My remote-work requests' })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work requests retrieved successfully',
    isArray: true,
  })
  myRemote(@CurrentUser('sub') userId: number) {
    return this.remoteWork.mine(userId);
  }

  @Get('/remote-work/requests')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Remote-work requests',
    description: 'Admin/HR: everyone. Manager: their reports.',
  })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work requests retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN)
  listRemote(
    @CurrentUser() user: JwtPayload,
    @Query() query: RemoteWorkQueryDto,
  ) {
    return this.remoteWork.list(user, query);
  }

  @Patch('/remote-work/requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel my pending remote-work request' })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work request cancelled',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancelRemote(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.remoteWork.cancel(userId, id);
  }

  @Patch('/remote-work/requests/:id/approve')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Approve a remote-work request',
    description: 'Nobody reviews their own; managers only their reports.',
  })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work request approved',
  })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  approveRemote(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.remoteWork.approve(user, id);
  }

  @Patch('/remote-work/requests/:id/reject')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({ summary: 'Reject a remote-work request' })
  @ApiEnvelope(RemoteWorkResponseDto, {
    message: 'Remote-work request rejected',
  })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  rejectRemote(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.remoteWork.reject(user, id);
  }
}
