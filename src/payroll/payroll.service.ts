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
import { renderPayslipPdf } from './payslip.pdf.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { PayrollRunQueryDto } from './dto/payroll-run-query.dto.js';
import { SetPayslipAdjustmentsDto } from './dto/pay-component.dto.js';
import { fromMinor, toMinor } from '../common/utils/money.util.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { type Payslip } from '../database/schema/payroll.schema.js';
import { maskAccountNumber } from './payroll.util.js';
import { toCsv } from '../common/utils/csv.util.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class PayrollService {
  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly employeeService: EmployeesService,
    private readonly companyService: CompanyService,
    private readonly calendarService: CalendarService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async listRuns(query: PayrollRunQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.payrollRepository.findRunPage(
      { status: query.status, year: query.year },
      window,
    );
    return paginated(items, total, window);
  }

  async runSummary(runId: number) {
    const run = await this.payrollRepository.findRunSummary(runId);
    if (!run) {
      throw new NotFoundException(`Payroll run with id ${runId} not found`);
    }
    return run;
  }

  /** Drafts only: approved runs are released to employees and the bank. */
  async deleteDraft(runId: number) {
    await this.findRun(runId);
    if (!(await this.payrollRepository.deleteDraft(runId))) {
      throw new ConflictException('Only draft runs can be deleted');
    }
    await this.audit.record({
      action: 'payroll_run.deleted',
      entityType: 'payroll_run',
      entityId: runId,
    });
  }

  async generate(month: string) {
    const run = await this.payrollRepository.generate(
      month,
      await this.calendarService.weekendDays(),
    );
    await this.audit.record({
      action: 'payroll_run.generated',
      entityType: 'payroll_run',
      entityId: run.id,
      metadata: { month },
    });
    return run;
  }

  /** Approval releases the payslips, so employees are told they're ready. */
  async approve(approverUserId: number, runId: number) {
    const run = await this.payrollRepository.approve(runId, approverUserId);
    await this.audit.record({
      action: 'payroll_run.approved',
      entityType: 'payroll_run',
      entityId: runId,
      metadata: { month: run.month },
    });
    this.notifications.payslipsReleased(run.id, run.month);
    return run;
  }

  async markPaid(runId: number) {
    const run = await this.payrollRepository.markPaid(runId);
    await this.audit.record({
      action: 'payroll_run.paid',
      entityType: 'payroll_run',
      entityId: runId,
      metadata: { month: run.month },
    });
    return run;
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

  /** One-off bonus/arrears/penalty lines on a draft run's payslip. */
  async setAdjustments(payslipId: number, dto: SetPayslipAdjustmentsDto) {
    const result = await this.payrollRepository.setAdjustments(
      payslipId,
      dto.adjustments.map((a) => ({
        label: a.label,
        kind: a.kind,
        amount: fromMinor(toMinor(a.amount)),
        source: 'adjustment' as const,
      })),
    );
    if (!result) {
      throw new NotFoundException(`Payslip with id ${payslipId} not found`);
    }
    await this.audit.record({
      action: 'payslip.adjusted',
      entityType: 'payslip',
      entityId: payslipId,
      before: { lines: result.before.lines, netPay: result.before.netPay },
      after: { lines: result.after.lines, netPay: result.after.netPay },
      metadata: {
        employeeId: result.after.employeeId,
        payrollRunId: result.after.payrollRunId,
      },
    });
    return this.toPayslipResponse(result.after);
  }

  /**
   * Admin/HR: any payslip. Employees: their own, once the run is approved
   * (drafts can still change). Others get 404, not 403.
   */
  async payslipPdf(requester: JwtPayload, payslipId: number) {
    const detail = await this.payrollRepository.findPayslipDetail(payslipId);
    const isAdmin = [UserRole.SuperAdmin, UserRole.Admin, UserRole.Hr].includes(
      requester.role,
    );
    if (
      !detail ||
      (!isAdmin &&
        (detail.employee.userId !== requester.sub ||
          detail.run.status === 'draft'))
    ) {
      throw new NotFoundException(`Payslip with id ${payslipId} not found`);
    }

    const company = await this.companyService.findOptional();
    const pdf = await renderPayslipPdf({
      company,
      logo: await this.companyService.logoBytes(company),
      ...detail,
    });
    const period = detail.run.month.slice(0, 7);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="payslip-${period}-${detail.employee.employeeCode}.pdf"`,
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
