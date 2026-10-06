import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../user/user.types.js';
import { PayrollPolicyService } from './payroll-policy.service.js';
import {
  PayrollPolicyResponseDto,
  UpdatePayrollPolicyDto,
} from './dto/payroll-policy.dto.js';

@Auth()
@ApiTags('Admin · Payroll policy')
@Controller('payroll')
export class PayrollPolicyController {
  constructor(private readonly service: PayrollPolicyService) {}

  @Get('policy')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Payroll policy',
    description:
      'Daily rates for unpaid leave and encashment, and how partial months are pro-rated.',
  })
  @ApiEnvelope(PayrollPolicyResponseDto, {
    message: 'Payroll policy retrieved',
  })
  get() {
    return this.service.rules();
  }

  @Patch('policy')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Update the payroll policy',
    description:
      'Omitted fields keep their value. Affects runs generated and settlements ' +
      'recomputed afterwards; issued payslips are unchanged.',
  })
  @ApiEnvelope(PayrollPolicyResponseDto, { message: 'Payroll policy updated' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  update(
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdatePayrollPolicyDto,
  ) {
    return this.service.update(userId, dto);
  }
}
