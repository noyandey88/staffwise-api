import {
  Controller,
  Get,
  Query,
  Param,
  HttpStatus,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import {
  AttendanceSummaryItemDto,
  AttendanceDayDto,
  AttendanceRecordResponseDto,
} from './dto/attendance-response.dto.js';
import { MonthQueryDto } from './dto/month-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import {
  AttendanceCorrectionQueryDto,
  AttendanceCorrectionResponseDto,
} from './dto/attendance-correction.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.types.js';

@Auth()
@ApiTags('Admin · Attendance')
@Controller('attendance')
export class AttendanceAdminController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('summary')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Monthly attendance summary, ranked by hours worked',
  })
  @ApiEnvelope(AttendanceSummaryItemDto, {
    message: 'Summary retrieved successfully',
    isArray: true,
  })
  async summary(@Query() query: MonthQueryDto) {
    return await this.attendanceService.summary(query.month);
  }

  @Get('corrections')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Attendance corrections, filterable',
    description: 'Admin/HR: everyone. Manager: only their reports.',
  })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance corrections retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN)
  findCorrections(
    @CurrentUser() user: JwtPayload,
    @Query() query: AttendanceCorrectionQueryDto,
  ) {
    return this.attendanceService.findCorrections(user, query);
  }

  @Patch('corrections/:id/approve')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Approve an attendance correction',
    description:
      "Writes the corrected times onto the day's record (creating it if missing). " +
      'Nobody reviews their own; managers only their reports.',
  })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance correction approved',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  approveCorrection(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.attendanceService.approveCorrection(user, id);
  }

  @Patch('corrections/:id/reject')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({ summary: 'Reject an attendance correction' })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance correction rejected',
  })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  rejectCorrection(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.attendanceService.rejectCorrection(user, id);
  }

  @Get('employees/:id')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Attendance records for an employee',
    description: 'Admin/HR: any employee. Manager: self and reports only.',
  })
  @ApiEnvelope(AttendanceRecordResponseDto, {
    message: 'Attendance retrieved successfully',
    isArray: true,
  })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MonthQueryDto,
  ) {
    return await this.attendanceService.findForEmployee(user, id, query.month);
  }

  @Get('employees/:id/days')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: "An employee's day-by-day status for a month",
    description: 'Admin/HR: any employee. Manager: self and reports only.',
  })
  @ApiEnvelope(AttendanceDayDto, {
    message: 'Attendance days retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async employeeDays(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MonthQueryDto,
  ) {
    return await this.attendanceService.daysForEmployee(user, id, query.month);
  }
}
