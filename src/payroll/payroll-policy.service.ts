import { Injectable } from '@nestjs/common';
import { PayrollPolicyRepository } from './payroll-policy.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdatePayrollPolicyDto } from './dto/payroll-policy.dto.js';
import { DEFAULT_PAYROLL_POLICY, type PolicyRules } from './policy.calc.js';

/**
 * Payroll rules chosen per deployment. Applies to runs generated and
 * settlements (re)computed afterwards; issued payslips and finalized
 * settlements keep their lines.
 */
@Injectable()
export class PayrollPolicyService {
  constructor(
    private readonly repository: PayrollPolicyRepository,
    private readonly audit: AuditService,
  ) {}

  /** Defaults until a product owner saves a policy. */
  async rules(): Promise<PolicyRules & { updatedAt: Date | null }> {
    const row = await this.repository.find();
    if (!row) return { ...DEFAULT_PAYROLL_POLICY, updatedAt: null };
    const { id: _id, updatedBy: _by, createdAt: _at, ...rules } = row;
    return rules;
  }

  async update(userId: number, dto: UpdatePayrollPolicyDto) {
    const before = await this.rules();
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined && v !== null),
    );
    if (Object.keys(changes).length === 0) return before;
    await this.repository.save({ ...changes, updatedBy: userId });
    const after = await this.rules();
    await this.audit.record({
      action: 'payroll_policy.updated',
      entityType: 'payroll_policy',
      entityId: 1,
      before,
      after,
    });
    return after;
  }
}
