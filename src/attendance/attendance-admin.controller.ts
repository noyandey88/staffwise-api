import { Controller, Get, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { AttendanceSummaryItemDto } from './dto/attendance-response.dto.js';
import { MonthQueryDto } from './dto/month-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@Auth()
@ApiTags('Admin · Attendance')
@Controller('admin')
export class AttendanceAdminController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('attendance/summary')
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
