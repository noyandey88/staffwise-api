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
  Ip,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import {
  AttendanceDayDto,
  AttendanceRecordResponseDto,
} from './dto/attendance-response.dto.js';
import {
  AttendanceCorrectionResponseDto,
  CreateAttendanceCorrectionDto,
} from './dto/attendance-correction.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MonthQueryDto } from './dto/month-query.dto.js';
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
      'approved remote-work request (else blocked or flagged, per attendance policy). ' +
      'Office check-ins may need an office network or latitude/longitude (officeCheckInVerification).',
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
  create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CheckInDto,
    @Ip() ip: string,
  ) {
    return this.attendanceService.checkIn(userId, dto, ip);
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
}
