import {
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PayrollRepository } from './payroll.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CompanyService } from '../company/company.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { NotificationService } from '../mail/notification.service.js';
import { type Payslip } from '../database/schema/payroll.schema.js';
import { maskAccountNumber, toCsv } from './payroll.util.js';

@Injectable()
export class PayrollService {
  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly employeeService: EmployeesService,
    private readonly companyService: CompanyService,
    private readonly calendarService: CalendarService,
    private readonly notifications: NotificationService,
  ) {}

  async generate(month: string) {
    return await this.payrollRepository.generate(
      month,
      await this.calendarService.weekendDays(),
    );
  }

  /** Approval releases the payslips, so employees are told they're ready. */
  async approve(approverUserId: number, runId: number) {
    const run = await this.payrollRepository.approve(runId, approverUserId);
    this.notifications.payslipsReleased(run.id, run.month);
    return run;
  }

  async markPaid(runId: number) {
    return await this.payrollRepository.markPaid(runId);
  }

  async payslipsForRun(runId: number) {
    await this.findRun(runId);
    const slips = await this.payrollRepository.payslipsForRun(runId);
    return slips.map((s) => this.toPayslipResponse(s));
  }

  async myPaySlips(userId: number) {
    const employee = await this.employeeService.findByUserId(userId);
    const slips = await this.payrollRepository.payslipsForEmployee(employee.id);
    return slips.map((s) => this.toPayslipResponse(s));
  }

  /**
   * Bank transfer file for an approved (or paid, for re-download) run:
   * one credit line per payslip, with the account snapshotted at approval.
   */
  async bankFile(runId: number) {
    const run = await this.findRun(runId);
    if (run.status === 'draft') {
      throw new ConflictException(
        'Approve the run before exporting the bank file',
      );
    }

    const [slips, company] = await Promise.all([
      this.payrollRepository.payslipsForRun(runId),
      this.companyService.findOptional(),
    ]);
    const period = run.month.slice(0, 7);
    const reference = `Salary ${period}`;
    const currency = company?.currency ?? '';

    const csv = toCsv([
      [
        'employee_id',
        'account_holder_name',
        'bank_name',
        'branch_name',
        'account_number',
        'routing_number',
        'amount',
        'currency',
        'reference',
      ],
      ...slips.map((s) => [
        s.employeeId,
        s.bankAccountHolderName,
        s.bankName,
        s.bankBranchName,
        s.bankAccountNumber,
        s.bankRoutingNumber,
        s.netPay,
        currency,
        reference,
      ]),
    ]);

    return new StreamableFile(Buffer.from(csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="payroll-${period}-run-${run.id}.csv"`,
    });
  }

  private async findRun(runId: number) {
    const run = await this.payrollRepository.findRun(runId);
    if (!run) {
      throw new NotFoundException(`Payroll run with id ${runId} not found`);
    }
    return run;
  }

  private toPayslipResponse(slip: Payslip) {
    return {
      ...slip,
      bankAccountNumber: maskAccountNumber(slip.bankAccountNumber),
    };
  }
}
