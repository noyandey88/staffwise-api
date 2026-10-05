import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../user/user.types.js';
import { WorkModeService } from './work-mode.service.js';
import { RemoteWorkService } from './remote-work.service.js';
import {
  CreateWorkArrangementDto,
  WorkArrangementQueryDto,
  WorkArrangementResponseDto,
} from './dto/work-arrangement.dto.js';

@Auth()
@ApiTags('Admin · Work modes')
@Controller('admin')
export class WorkModeAdminController {
  constructor(
    private readonly service: WorkModeService,
    private readonly remoteWork: RemoteWorkService,
  ) {}

  @Get('work-arrangements')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Work arrangements (company, department, employee)',
  })
  @ApiEnvelope(WorkArrangementResponseDto, {
    message: 'Work arrangements retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  list(@Query() query: WorkArrangementQueryDto) {
    return this.service.list(query);
  }

  @Post('work-arrangements')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Set a work arrangement from a date',
    description:
      'onsite, remote, or hybrid (fixed officeDays or an officeDaysPerWeek quota) ' +
      'for the company, a department or an employee; the most specific applies.',
  })
  @ApiEnvelope(WorkArrangementResponseDto, {
    message: 'Work arrangement saved',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWorkArrangementDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Delete('work-arrangements/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Cancel a scheduled (future) work arrangement' })
  @ApiEnvelope(null, { message: 'Work arrangement removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return null;
  }
}
