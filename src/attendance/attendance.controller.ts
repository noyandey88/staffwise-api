import {
  Controller,
  Get,
  Post,
  Param,
  HttpStatus,
  Query,
  ParseIntPipe,
  Patch,
  Body,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import {
  AttendanceDayDto,
  AttendanceRecordResponseDto,
  AttendanceSummaryItemDto,
} from './dto/attendance-response.dto.js';
import {
  AttendanceCorrectionQueryDto,
  AttendanceCorrectionResponseDto,
  CreateAttendanceCorrectionDto,
} from './dto/attendance-correction.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MonthQueryDto } from './dto/month-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { CheckInDto } from './dto/check-in.dto.js';

@Auth()
@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('/check-in')
  @ApiOperation({
    summary: 'Check in for today',
    description:
      'Optional location (office/remote). Remote on an expected office day needs an ' +
      'approved remote-work request (else blocked or flagged, per attendance policy).',
  })
  @ApiEnvelope(AttendanceRecordResponseDto, {
    message: 'Checked in successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.CONFLICT,
    HttpStatus.NOT_FOUND,
    HttpStatus.FORBIDDEN,
  )
  create(@CurrentUser('sub') userId: number, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(userId, dto);
  }

  @Post('/check-out')
  @ApiOperation({ summary: 'Check out for today' })
  @ApiEnvelope(AttendanceRecordResponseDto, {
    message: 'Checked out successfully',
  })
  @ApiErrorResponses(
    HttpStatus.CONFLICT,
    HttpStatus.NOT_FOUND,
    HttpStatus.FORBIDDEN,
  )
  checkOut(@CurrentUser('sub') userId: number) {
    return this.attendanceService.checkOut(userId);
  }

  @Get('/me')
  @ApiOperation({ summary: 'My attendance records for a month' })
  @ApiEnvelope(AttendanceRecordResponseDto, {
    message: 'Attendance retrieved successfully',
    isArray: true,
  })
  findMine(
    @CurrentUser('sub', ParseIntPipe) userId: number,
    @Query() query: MonthQueryDto,
  ) {
    return this.attendanceService.findMine(userId, query.month);
  }

  @Get('/me/days')
  @ApiOperation({
    summary: 'My day-by-day status for a month',
    description:
      'present/late/absent/leave/holiday/weekend/upcoming per day, derived at read time',
  })
  @ApiEnvelope(AttendanceDayDto, {
    message: 'Attendance days retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  myDays(@CurrentUser('sub') userId: number, @Query() query: MonthQueryDto) {
    return this.attendanceService.myDays(userId, query.month);
  }

  @Get('/employee/:id/days')
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

  // --- corrections ---

  @Post('/corrections')
  @ApiOperation({
    summary: 'Request an attendance correction',
    description:
      "Fix a day's check-in and/or check-out (today or the last 30 days). " +
      'Applied to the record when approved.',
  })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance correction submitted',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  requestCorrection(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateAttendanceCorrectionDto,
  ) {
    return this.attendanceService.requestCorrection(userId, dto);
  }

  @Get('/corrections/me')
  @ApiOperation({ summary: 'My attendance corrections' })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance corrections retrieved successfully',
    isArray: true,
  })
  myCorrections(@CurrentUser('sub') userId: number) {
    return this.attendanceService.myCorrections(userId);
  }

  @Get('/corrections')
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

  @Patch('/corrections/:id/cancel')
  @ApiOperation({ summary: 'Cancel my pending attendance correction' })
  @ApiEnvelope(AttendanceCorrectionResponseDto, {
    message: 'Attendance correction cancelled',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancelCorrection(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.attendanceService.cancelCorrection(userId, id);
  }

  @Patch('/corrections/:id/approve')
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

  @Patch('/corrections/:id/reject')
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

  @Get('/employee/:id')
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

  @Get('/summary')
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
}
