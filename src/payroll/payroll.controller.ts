import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { GenerateRunDto } from './dto/create-payroll.dto.js';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { PayrollRunResponseDto } from './dto/payroll-run-response.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { PayslipResponseDto } from './dto/payslip-response.dto.js';
import { Auth } from '../common/decorators/auth.decorator.js';

@Auth()
@ApiTags('Payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('/runs')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Generate a payroll run for a month' })
  @ApiEnvelope(PayrollRunResponseDto, {
    message: 'Payroll run generated',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.CONFLICT, HttpStatus.NOT_FOUND)
  create(@Body() dto: GenerateRunDto) {
    return this.payrollService.generate(dto.month);
  }

  @Patch('/runs/:id/approve')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Approve a draft payroll run' })
  @ApiEnvelope(PayrollRunResponseDto, { message: 'Payroll run approved' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.payrollService.approve(user, id);
  }

  @Patch('/runs/:id/mark-paid')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Mark an approved run as paid' })
  @ApiEnvelope(PayrollRunResponseDto, { message: 'Payroll run marked as paid' })
  @ApiErrorResponses(HttpStatus.CONFLICT)
  async markPaid(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.markPaid(id);
  }

  @Get('/runs/:id/bank-file')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Download the bank transfer file (CSV) for an approved run',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV attachment (not wrapped in the response envelope)',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  bankFile(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.bankFile(id);
  }

  @Get('/runs/:id/payslips')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Payslips for a payroll run' })
  @ApiEnvelope(PayslipResponseDto, {
    message: 'Payslips retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async payslipsForRun(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.payslipsForRun(id);
  }

  @Get('/payslips/me')
  @ApiOperation({ summary: 'My payslip history' })
  @ApiEnvelope(PayslipResponseDto, {
    message: 'Payslips retrieved successfully',
    isArray: true,
  })
  async myPayslips(@CurrentUser('sub') userId: number) {
    return await this.payrollService.myPaySlips(userId);
  }
}
