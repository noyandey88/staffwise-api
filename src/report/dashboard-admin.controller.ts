import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { UserRole } from '../user/user.types.js';
import { ReportService } from './report.service.js';
import { OverviewDto } from './dto/report.dto.js';

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
}
