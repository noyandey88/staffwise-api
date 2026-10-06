import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { ReportService } from './report.service.js';
import {
  AttendanceReportRowDto,
  DepartmentHeadcountDto,
  FormatQueryDto,
  LeaveReportRowDto,
  MonthReportQueryDto,
  PayrollReportRowDto,
  YearReportQueryDto,
} from './dto/report.dto.js';

@Auth()
@ApiTags('Admin · Dashboard & reports')
@Controller('reports')
export class ReportsAdminController {
  constructor(private readonly service: ReportService) {}

  @Get('headcount')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Headcount by department and employment type' })
  @ApiProduces('application/json', 'text/csv')
  @ApiEnvelope(DepartmentHeadcountDto, {
    message: 'Report generated',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  headcount(@Query() query: FormatQueryDto) {
    return this.service.headcount(query.format);
  }

  @Get('attendance')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Monthly attendance per employee',
    description: 'Same day classification as /attendance/me/days.',
  })
  @ApiProduces('application/json', 'text/csv')
  @ApiEnvelope(AttendanceReportRowDto, {
    message: 'Report generated',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  attendance(@Query() query: MonthReportQueryDto) {
    return this.service.attendance(query.month, query.format);
  }

  @Get('leave')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Leave taken and remaining per employee and type' })
  @ApiProduces('application/json', 'text/csv')
  @ApiEnvelope(LeaveReportRowDto, {
    message: 'Report generated',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  leave(@Query() query: YearReportQueryDto) {
    return this.service.leave(query.year, query.format);
  }

  @Get('payroll')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Payroll cost per month (approved and paid runs)' })
  @ApiProduces('application/json', 'text/csv')
  @ApiEnvelope(PayrollReportRowDto, {
    message: 'Report generated',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  payroll(@Query() query: YearReportQueryDto) {
    return this.service.payroll(query.year, query.format);
  }
}
