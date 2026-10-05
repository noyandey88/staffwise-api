import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpStatus,
  ParseIntPipe,
  Delete,
  Query,
  Put,
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
import {
  PayrollRunResponseDto,
  PayrollRunSummaryDto,
} from './dto/payroll-run-response.dto.js';
import { PayrollRunQueryDto } from './dto/payroll-run-query.dto.js';
import { SetPayslipAdjustmentsDto } from './dto/pay-component.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PayslipResponseDto } from './dto/payslip-response.dto.js';
import { Auth } from '../common/decorators/auth.decorator.js';

@Auth()
@ApiTags('Admin · Payroll')
@Controller('admin')
export class PayrollAdminController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('payroll/runs')
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

  @Get('payroll/runs')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Payroll runs, newest month first, with totals' })
  @ApiEnvelope(PayrollRunSummaryDto, {
    message: 'Payroll runs retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  listRuns(@Query() query: PayrollRunQueryDto) {
    return this.payrollService.listRuns(query);
  }

  @Get('payroll/runs/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'A payroll run with its totals' })
  @ApiEnvelope(PayrollRunSummaryDto, {
    message: 'Payroll run retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  runSummary(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.runSummary(id);
  }

  @Delete('payroll/runs/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Delete a draft run',
    description: 'To regenerate it, e.g. after fixing salaries or leave.',
  })
  @ApiEnvelope(null, { message: 'Payroll run deleted' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async deleteDraft(@Param('id', ParseIntPipe) id: number) {
    await this.payrollService.deleteDraft(id);
    return null;
  }

  @Patch('payroll/runs/:id/approve')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Approve a draft payroll run' })
  @ApiEnvelope(PayrollRunResponseDto, { message: 'Payroll run approved' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async approve(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.payrollService.approve(userId, id);
  }

  @Patch('payroll/runs/:id/mark-paid')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Mark an approved run as paid' })
  @ApiEnvelope(PayrollRunResponseDto, { message: 'Payroll run marked as paid' })
  @ApiErrorResponses(HttpStatus.CONFLICT)
  async markPaid(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.markPaid(id);
  }

  @Get('payroll/runs/:id/bank-file')
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

  @Get('payroll/runs/:id/payslips')
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

  @Put('payroll/payslips/:id/adjustments')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: "Set a draft payslip's one-off adjustments",
    description:
      'Bonus, arrears, penalty…; replaces all adjustment lines and recomputes totals.',
  })
  @ApiEnvelope(PayslipResponseDto, { message: 'Payslip adjusted' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  setAdjustments(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPayslipAdjustmentsDto,
  ) {
    return this.payrollService.setAdjustments(id, dto);
  }
}
