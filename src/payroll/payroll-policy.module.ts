import { Module } from '@nestjs/common';
import { PayrollPolicyController } from './payroll-policy.controller.js';
import { PayrollPolicyService } from './payroll-policy.service.js';
import { PayrollPolicyRepository } from './payroll-policy.repository.js';

/** Separate from PayrollModule so separations can use the rules too. */
@Module({
  controllers: [PayrollPolicyController],
  providers: [PayrollPolicyService, PayrollPolicyRepository],
  exports: [PayrollPolicyService],
})
export class PayrollPolicyModule {}
