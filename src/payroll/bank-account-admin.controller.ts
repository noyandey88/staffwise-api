import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { BankAccountService } from './bank-account.service.js';
import {
  BankAccountResponseDto,
  CreateBankAccountDto,
} from './dto/bank-account.dto.js';

/**
 * Salary accounts are managed by Admin/HR only, so a compromised employee
 * login can't redirect a salary. Employees can view theirs (masked).
 */
@Auth()
@ApiTags('Admin · Payroll')
@Controller('admin')
export class BankAccountAdminController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get('payroll/employees/:employeeId/bank-accounts')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "An employee's salary bank accounts" })
  @ApiEnvelope(BankAccountResponseDto, {
    message: 'Bank accounts retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findForEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.bankAccountService.findForEmployee(employeeId);
  }

  @Post('payroll/employees/:employeeId/bank-accounts')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Add a salary bank account for an employee' })
  @ApiEnvelope(BankAccountResponseDto, {
    message: 'Bank account added',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  create(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.bankAccountService.create(employeeId, dto);
  }

  @Patch('payroll/bank-accounts/:id/primary')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "Make this the employee's salary account" })
  @ApiEnvelope(BankAccountResponseDto, { message: 'Primary account updated' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  setPrimary(@Param('id', ParseIntPipe) id: number) {
    return this.bankAccountService.setPrimary(id);
  }

  @Delete('payroll/bank-accounts/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Remove a bank account',
    description:
      'Past payslips keep their snapshot. Removing the primary leaves the employee without one until another is set.',
  })
  @ApiEnvelope(null, { message: 'Bank account removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bankAccountService.remove(id);
  }
}
