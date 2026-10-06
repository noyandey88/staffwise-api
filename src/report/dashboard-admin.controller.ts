import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { UserRole } from '../user/user.types.js';
import { ReportService } from './report.service.js';
import { OverviewDto, TeamDashboardDto } from './dto/report.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';

@Auth()
@ApiTags('Admin · Dashboard & reports')
@Controller('dashboard')
export class DashboardAdminController {
  constructor(private readonly service: ReportService) {}

  @Get()
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

  @Get('team')
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
}
