import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { AuditService } from './audit.service.js';
import { AuditLogQueryDto, AuditLogResponseDto } from './dto/audit-log.dto.js';

@Auth()
@Roles(UserRole.Admin)
@ApiTags('Admin · Audit log')
@Controller('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Audit log (Admin only)',
    description:
      'Sensitive changes, newest first: who, what, when, from where, and the changed fields.',
  })
  @ApiEnvelope(AuditLogResponseDto, {
    message: 'Audit log retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async find(@Query() query: AuditLogQueryDto) {
    return await this.auditService.find(query);
  }
}
