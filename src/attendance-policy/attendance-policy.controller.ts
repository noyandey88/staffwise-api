import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../user/user.types.js';
import { AttendancePolicyService } from './attendance-policy.service.js';
import {
  AttendancePolicyResponseDto,
  CreateAttendancePolicyDto,
} from './dto/attendance-policy.dto.js';

@Auth()
@ApiTags('Attendance policy')
@Controller('attendance-policies')
export class AttendancePolicyController {
  constructor(private readonly service: AttendancePolicyService) {}

  @Get()
  @ApiOperation({
    summary: 'Attendance policy history',
    description:
      'Timezone, work start, late grace, standard minutes and correction limits; ' +
      'newest first, `current` is in force today.',
  })
  @ApiEnvelope(AttendancePolicyResponseDto, {
    message: 'Attendance policies retrieved successfully',
    isArray: true,
  })
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Set the attendance policy from a date',
    description:
      'Omitted fields are copied from the policy in force on effectiveFrom. ' +
      'Earlier days keep their rules (lateness/overtime are computed per day).',
  })
  @ApiEnvelope(AttendancePolicyResponseDto, {
    message: 'Attendance policy saved',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateAttendancePolicyDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Delete('/:id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Cancel a scheduled (future) attendance policy' })
  @ApiEnvelope(null, { message: 'Attendance policy removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return null;
  }
}
