import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BankAccountService } from './bank-account.service.js';
import { BankAccountResponseDto } from './dto/bank-account.dto.js';

/**
 * Salary accounts are managed by Admin/HR only, so a compromised employee
 * login can't redirect a salary. Employees can view theirs (masked).
 */
@Auth()
@ApiTags('Payroll')
@Controller('payroll')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get('/bank-accounts/me')
  @ApiOperation({ summary: 'My salary bank accounts' })
  @ApiEnvelope(BankAccountResponseDto, {
    message: 'Bank accounts retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findMine(@CurrentUser('sub') userId: number) {
    return this.bankAccountService.findMine(userId);
  }
}
