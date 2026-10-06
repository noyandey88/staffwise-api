import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { WorkModeService } from './work-mode.service.js';
import {
  ResolvedArrangementQueryDto,
  ResolvedArrangementResponseDto,
} from './dto/work-arrangement.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@Auth()
@ApiTags('Admin · Work modes')
@Controller('employees')
export class EmployeeWorkArrangementAdminController {
  constructor(private readonly service: WorkModeService) {}

  @Get(':id/work-arrangement')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: "An employee's work arrangement",
    description: 'Admin/HR, the employee, or their managers.',
  })
  @ApiEnvelope(ResolvedArrangementResponseDto, {
    message: 'Work arrangement retrieved',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  forEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ResolvedArrangementQueryDto,
  ) {
    return this.service.forEmployee(user, id, query.date);
  }
}
