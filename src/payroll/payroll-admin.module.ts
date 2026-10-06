import { Module } from '@nestjs/common';
import { PayrollModule } from './payroll.module.js';
import { PayrollAdminController } from './payroll-admin.controller.js';
import { BankAccountAdminController } from './bank-account-admin.controller.js';
import { SalaryStructureAdminController } from './salary-structure-admin.controller.js';
import { PayComponentController } from './pay-component.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [PayrollModule],
  controllers: [
    PayrollAdminController,
    BankAccountAdminController,
    SalaryStructureAdminController,
    PayComponentController,
  ],
})
export class PayrollAdminModule {}
