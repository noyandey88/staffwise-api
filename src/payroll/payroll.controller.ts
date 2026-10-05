import {
  Controller,
  Get,
  Param,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PayslipResponseDto } from './dto/payslip-response.dto.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';

@Auth()
@ApiTags('Payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('/payslips/:id/pdf')
  @ApiOperation({
    summary: 'Download a payslip as PDF',
    description:
      'Admin/HR: any payslip. Employees: their own from approved or paid runs.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF attachment (not wrapped in the response envelope)',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  payslipPdf(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.payrollService.payslipPdf(user, id);
  }

  @Get('/payslips/me')
  @ApiOperation({
    summary: 'My payslip history',
    description: 'Only payslips from approved or paid runs.',
  })
  @ApiEnvelope(PayslipResponseDto, {
    message: 'Payslips retrieved successfully',
    isArray: true,
  })
  async myPayslips(@CurrentUser('sub') userId: number) {
    return await this.payrollService.myPaySlips(userId);
  }
}
