import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { RemoteWorkService } from './remote-work.service.js';
import {
  RemoteWorkQueryDto,
  RemoteWorkResponseDto,
} from './dto/remote-work.dto.js';

@Auth()
@ApiTags('Admin · Work modes')
@Controller('remote-work')
export class RemoteWorkAdminController {
  constructor(private readonly remoteWork: RemoteWorkService) {}

  @Get('requests')
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

  @Patch('requests/:id/approve')
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

  @Patch('requests/:id/reject')
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
