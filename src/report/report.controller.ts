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
  MonthReportQueryDto,
  TeamDashboardDto,
  WorkModeReportRowDto,
} from './dto/report.dto.js';

@Auth()
@ApiTags('Dashboard & reports')
@Controller()
export class ReportController {
  constructor(private readonly service: ReportService) {}

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
}
