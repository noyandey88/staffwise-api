import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { ReportService } from './report.service.js';
import {
  AttendanceReportRowDto,
  DepartmentHeadcountDto,
  FormatQueryDto,
  LeaveReportRowDto,
  MonthReportQueryDto,
  OverviewDto,
  PayrollReportRowDto,
  TeamDashboardDto,
  YearReportQueryDto,
  WorkModeReportRowDto,
} from './dto/report.dto.js';

@Auth()
@ApiTags('Dashboard & reports')
@Controller()
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get('/dashboard/overview')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Company dashboard',
    description:
      "Headcount, this month's joiners/leavers, today's attendance, pending approvals, latest payroll run, birthdays this week.",
  })
  @ApiEnvelope(OverviewDto, { message: 'Dashboard retrieved successfully' })
  overview() {
    return this.service.overview();
  }

  @Get('/dashboard/team')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'My team dashboard',
    description:
      "Today's status and open requests for your direct and indirect reports.",
  })
  @ApiEnvelope(TeamDashboardDto, {
    message: 'Dashboard retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  team(@CurrentUser() user: JwtPayload) {
    return this.service.team(user);
  }

  @Get('/reports/headcount')
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

  @Get('/reports/attendance')
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

  @Get('/reports/work-modes')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Office vs remote days and arrangement compliance',
    description:
      'Per employee for the month up to today. Admin/HR: everyone; managers: their reports.',
  })
  @ApiProduces('application/json', 'text/csv')
  @ApiEnvelope(WorkModeReportRowDto, {
    message: 'Report generated',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  workModes(
    @CurrentUser() user: JwtPayload,
    @Query() query: MonthReportQueryDto,
  ) {
    return this.service.workModes(user, query.month, query.format);
  }

  @Get('/reports/leave')
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

  @Get('/reports/payroll')
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
