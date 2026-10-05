import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { PayrollRepository } from './payroll.repository.js';
import { CompanyModule } from '../company/company.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { PayrollPolicyModule } from './payroll-policy.module.js';
import { BankAccountController } from './bank-account.controller.js';
import { BankAccountService } from './bank-account.service.js';
import { BankAccountRepository } from './bank-account.repository.js';
import { SalaryStructureController } from './salary-structure.controller.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { SalaryStructureRepository } from './salary-structure.repository.js';
import { PayComponentController } from './pay-component.controller.js';
import { PayComponentService } from './pay-component.service.js';
import { PayComponentRepository } from './pay-component.repository.js';
import { PayrollAdminController } from './payroll-admin.controller.js';
import { BankAccountAdminController } from './bank-account-admin.controller.js';
import { SalaryStructureAdminController } from './salary-structure-admin.controller.js';

@Module({
  imports: [
    EmployeesModule,
    CompanyModule,
    CalendarModule,
    PayrollPolicyModule,
  ],
  controllers: [
    PayrollController,
    PayrollAdminController,
    BankAccountController,
    BankAccountAdminController,
    SalaryStructureController,
    SalaryStructureAdminController,
    PayComponentController,
  ],
  providers: [
    PayrollService,
    PayrollRepository,
    BankAccountService,
    BankAccountRepository,
    SalaryStructureService,
    SalaryStructureRepository,
    PayComponentService,
    PayComponentRepository,
  ],
})
export class PayrollModule {}
