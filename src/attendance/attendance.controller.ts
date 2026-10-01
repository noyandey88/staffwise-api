import {
  Controller,
  Get,
  Post,
  Param,
  HttpStatus,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import {
  AttendanceRecordResponseDto,
  AttendanceSummaryItemDto,
} from './dto/attendance-response.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MonthQueryDto } from './dto/month-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import type { JwtPayload } from '../auth/auth.types.js';

@Auth()
@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('/check-in')
  @ApiOperation({ summary: 'Check in for today' })
  @ApiEnvelope(AttendanceRecordResponseDto, {
    message: 'Checked in successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.CONFLICT,
    HttpStatus.NOT_FOUND,
    HttpStatus.FORBIDDEN,
  )
  create(@CurrentUser('sub') userId: number) {
    return this.attendanceService.checkIn(userId);
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
