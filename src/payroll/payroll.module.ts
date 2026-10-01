import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { PayrollRepository } from './payroll.repository.js';
import { CompanyModule } from '../company/company.module.js';
import { BankAccountController } from './bank-account.controller.js';
import { BankAccountService } from './bank-account.service.js';
import { BankAccountRepository } from './bank-account.repository.js';
import { SalaryStructureController } from './salary-structure.controller.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { SalaryStructureRepository } from './salary-structure.repository.js';

@Module({
  imports: [EmployeesModule, CompanyModule],
  controllers: [
    PayrollController,
    BankAccountController,
    SalaryStructureController,
  ],
  providers: [
    PayrollService,
    PayrollRepository,
    BankAccountService,
    BankAccountRepository,
    SalaryStructureService,
    SalaryStructureRepository,
  ],
})
export class PayrollModule {}
