import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SeparationRepository } from './separation.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CompanyService } from '../company/company.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../mail/notification.service.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';
import { today } from '../attendance/attendance.util.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import {
  ApproveSeparationDto,
  CreateSeparationDto,
  ResignDto,
  SeparationQueryDto,
  SetAdjustmentsDto,
} from './dto/separation.dto.js';
import type {
  Separation,
  SettlementLine,
} from '../database/schema/separation.schema.js';
import { fromMinor, toMinor, totals } from './settlement.util.js';
import {
  amountForDays,
  encashmentRule,
  proRata,
  unpaidLeaveRule,
} from '../payroll/policy.calc.js';
import { PayrollPolicyService } from '../payroll/payroll-policy.service.js';

const SEPARATION_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

@Injectable()
export class SeparationService {
  private readonly logger = new Logger(SeparationService.name);

  constructor(
    private readonly repository: SeparationRepository,
    private readonly employeesService: EmployeesService,
    private readonly companyService: CompanyService,
    private readonly calendarService: CalendarService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly policyService: PayrollPolicyService,
  ) {}

  // --- employee ---

  /** Resignation request; the last working day can't be in the past. */
  async resign(userId: number, dto: ResignDto) {
    const employee = await this.employeesService.findByUserId(userId);
    this.assertCurrent(employee.status);
    if (dto.lastWorkingDay < today()) {
      throw new BadRequestException('lastWorkingDay cannot be in the past');
    }
    const row = await this.repository.create({
      employeeId: employee.id,
      type: 'resignation',
      reason: dto.reason,
      lastWorkingDay: dto.lastWorkingDay,
      requestedBy: userId,
    });
    if (!row) {
      throw new ConflictException('You already have an open separation');
    }
    await this.record('requested', row);
    return row;
  }

  async mine(userId: number) {
    const employee = await this.employeesService.findByUserId(userId);
    return this.repository.findByEmployee(employee.id);
  }

  async cancel(userId: number, id: number) {
    const employee = await this.employeesService.findByUserId(userId);
    const existing = await this.repository.findById(id);
    if (!existing || existing.employeeId !== employee.id) {
      throw new NotFoundException('Separation not found');
    }
    const row = await this.repository.transition(id, ['requested'], {
      status: 'cancelled',
    });
    if (!row) {
      throw new ConflictException('Only pending requests can be cancelled');
    }
    await this.record('cancelled', row);
    return row;
  }

  // --- Admin/HR ---

  async list(query: SeparationQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.repository.findPage(
      { status: query.status, type: query.type },
      window,
    );
    return paginated(items, total, window);
  }

  /** Records a separation as already approved (termination, retirement, …). */
  async createApproved(requester: JwtPayload, dto: CreateSeparationDto) {
    const employee = await this.employeesService.findById(dto.employeeId);
    this.assertCurrent(employee.status);
    await this.assertNotOwn(requester, employee.id);
    this.assertAfterHire(dto.lastWorkingDay, employee.hiredAt);
    const row = await this.repository.create({
      employeeId: employee.id,
      type: dto.type,
      reason: dto.reason,
      lastWorkingDay: dto.lastWorkingDay,
      status: 'approved',
      requestedBy: requester.sub,
      reviewedBy: requester.sub,
      reviewedAt: new Date(),
    });
    if (!row) {
      throw new ConflictException(
        'This employee already has an open separation',
      );
    }
    await this.record('approved', row);
    return this.afterApproval(row);
  }

  async approve(requester: JwtPayload, id: number, dto: ApproveSeparationDto) {
    const existing = await this.findOrThrow(id);
    await this.assertNotOwn(requester, existing.employeeId);
    const employee = await this.employeesService.findById(existing.employeeId);
    const lastWorkingDay = dto.lastWorkingDay ?? existing.lastWorkingDay;
    this.assertAfterHire(lastWorkingDay, employee.hiredAt);
    const row = await this.repository.transition(id, ['requested'], {
      status: 'approved',
      lastWorkingDay,
      reviewedBy: requester.sub,
      reviewedAt: new Date(),
    });
    if (!row)
      throw new ConflictException('Only pending requests can be approved');
    await this.audit.record({
      action: 'separation.approved',
      entityType: 'separation',
      entityId: id,
      before: { lastWorkingDay: existing.lastWorkingDay },
      after: { lastWorkingDay },
      metadata: { employeeId: row.employeeId, type: row.type },
    });
    this.notifications.separationDecided(row);
    return this.afterApproval(row);
  }

  async reject(requester: JwtPayload, id: number) {
    const existing = await this.findOrThrow(id);
    await this.assertNotOwn(requester, existing.employeeId);
    const row = await this.repository.transition(id, ['requested'], {
      status: 'rejected',
      reviewedBy: requester.sub,
      reviewedAt: new Date(),
    });
    if (!row)
      throw new ConflictException('Only pending requests can be rejected');
    await this.record('rejected', row);
    this.notifications.separationDecided(row);
    return row;
  }

  /** Withdraws an approved separation before it takes effect. */
  async revoke(requester: JwtPayload, id: number) {
    const existing = await this.findOrThrow(id);
    await this.assertNotOwn(requester, existing.employeeId);
    const settlement = await this.repository.findSettlement(id);
    if (settlement && settlement.status !== 'draft') {
      throw new ConflictException(
        'The final settlement is already finalized; it cannot be withdrawn',
      );
    }
    const row = await this.repository.transition(id, ['approved'], {
      status: 'cancelled',
    });
    if (!row) {
      throw new ConflictException(
        'Only approved separations that have not taken effect can be withdrawn',
      );
    }
    await this.record('withdrawn', row);
    return row;
  }

  // --- completion ---

  /**
   * Applies every approved separation whose last working day has passed.
   * Idempotent: safe from the daily job, at startup and after approval.
   */
  async completeDue() {
    const due = await this.repository.findDue(today());
    let completed = 0;
    for (const separation of due) {
      if (await this.repository.complete(separation)) {
        completed++;
        await this.audit.record({
          action: 'separation.completed',
          entityType: 'separation',
          entityId: separation.id,
          metadata: {
            employeeId: separation.employeeId,
            type: separation.type,
            lastWorkingDay: separation.lastWorkingDay,
          },
        });
      }
    }
    if (completed) this.logger.log(`Completed ${completed} separation(s)`);
    return completed;
  }

  // --- settlement ---

  /** Admin/HR any time; the employee once it is finalized. Others: 404. */
  async settlement(requester: JwtPayload, separationId: number) {
    const separation = await this.repository.findById(separationId);
    const settlement = separation
      ? await this.repository.findSettlement(separationId)
      : undefined;
    if (SEPARATION_ADMIN_ROLES.includes(requester.role)) {
      if (!separation) throw new NotFoundException('Separation not found');
      if (!settlement) {
        throw new NotFoundException(
          'No settlement yet: it is created when the separation is approved',
        );
      }
      return settlement;
    }
    const me = await this.employeesService.findOptionalByUserId(requester.sub);
    if (
      !settlement ||
      me?.id !== settlement.employeeId ||
      settlement.status === 'draft'
    ) {
      throw new NotFoundException('Settlement not found');
    }
    return settlement;
  }

  /** Recalculates the draft from current data, keeping manual lines. */
  async recompute(separationId: number) {
    const separation = await this.findOrThrow(separationId);
    if (!['approved', 'completed'].includes(separation.status)) {
      throw new ConflictException(
        'Only approved separations have a settlement',
      );
    }
    const existing = await this.repository.findSettlement(separationId);
    if (existing && existing.status !== 'draft') {
      throw new ConflictException('The settlement is already finalized');
    }
    const manual = existing?.lines.filter((l) => l.source === 'manual') ?? [];
    return this.saveDraft(separation, manual);
  }

  async setAdjustments(separationId: number, dto: SetAdjustmentsDto) {
    const separation = await this.findOrThrow(separationId);
    const existing = await this.repository.findSettlement(separationId);
    if (!existing) throw new NotFoundException('Settlement not found');
    if (existing.status !== 'draft') {
      throw new ConflictException('The settlement is already finalized');
    }
    const manual: SettlementLine[] = dto.adjustments.map((a) => ({
      label: a.label,
      kind: a.kind,
      amount: fromMinor(toMinor(a.amount)),
      source: 'manual',
    }));
    const computed = existing.lines.filter((l) => l.source !== 'manual');
    const settlement = await this.saveLines(separation, existing.currency, [
      ...computed,
      ...manual,
    ]);
    await this.audit.record({
      action: 'settlement.adjusted',
      entityType: 'final_settlement',
      entityId: settlement.id,
      before: { manual: existing.lines.filter((l) => l.source === 'manual') },
      after: { manual },
    });
    return settlement;
  }

  async finalize(requester: JwtPayload, separationId: number) {
    const separation = await this.findOrThrow(separationId);
    await this.assertNotOwn(requester, separation.employeeId);
    const row = await this.repository.transitionSettlement(
      separationId,
      'draft',
      {
        status: 'finalized',
        finalizedBy: requester.sub,
        finalizedAt: new Date(),
      },
    );
    if (!row)
      throw new ConflictException('Only a draft settlement can be finalized');
    await this.audit.record({
      action: 'settlement.finalized',
      entityType: 'final_settlement',
      entityId: row.id,
      metadata: { separationId, netPay: row.netPay },
    });
    return row;
  }

  async markPaid(separationId: number) {
    const row = await this.repository.transitionSettlement(
      separationId,
      'finalized',
      { status: 'paid', paidAt: new Date() },
    );
    if (!row) {
      throw new ConflictException(
        'Only a finalized settlement can be marked paid',
      );
    }
    await this.audit.record({
      action: 'settlement.paid',
      entityType: 'final_settlement',
      entityId: row.id,
      metadata: { separationId, netPay: row.netPay },
    });
    return row;
  }

  // --- helpers ---

  /** Applies an already-due separation now and starts its settlement. */
  private async afterApproval(row: Separation) {
    await this.saveDraft(row, []);
    if (row.lastWorkingDay < today()) await this.completeDue();
    return (await this.repository.findById(row.id))!;
  }

  private async saveDraft(separation: Separation, manual: SettlementLine[]) {
    const company = await this.companyService.findOptional();
    const currency = company?.currency ?? 'BDT';
    const computed = await this.computeLines(separation);
    return this.saveLines(separation, currency, [...computed, ...manual]);
  }

  private async saveLines(
    separation: Separation,
    currency: string,
    lines: SettlementLine[],
  ) {
    const row = await this.repository.saveDraft({
      separationId: separation.id,
      employeeId: separation.employeeId,
      currency,
      lines,
      ...totals(lines),
    });
    if (!row)
      throw new ConflictException('The settlement is already finalized');
    return row;
  }

  /**
   * Final month's pay (unless that month's payroll already paid it), unpaid
   * leave taken that month, and encashable leave left for the year.
   */
  private async computeLines(
    separation: Separation,
  ): Promise<SettlementLine[]> {
    const lwd = separation.lastWorkingDay;
    const salary = await this.repository.salaryOn(separation.employeeId, lwd);
    if (!salary) return [];
    const [policy, month, employee] = await Promise.all([
      this.policyService.rules(),
      this.calendarService.monthDays(lwd),
      this.employeesService.findById(separation.employeeId),
    ]);
    const lines: SettlementLine[] = [];
    const label = `Salary for ${lwd.slice(0, 7)}`;

    if (
      await this.repository.hasPayslipForMonth(
        separation.employeeId,
        month.start,
      )
    ) {
      lines.push({
        label,
        kind: 'earning',
        amount: '0.00',
        source: 'salary',
        note: "Already included in that month's payroll run",
      });
    } else {
      // Paid from the 1st (or the hire date, if they joined this month).
      const from =
        employee.hiredAt > month.start ? employee.hiredAt : month.start;
      const worked = {
        calendarDays: Number(lwd.slice(8, 10)) - Number(from.slice(8, 10)) + 1,
        workingDays: await this.calendarService.workingDays(from, lwd),
      };
      const share = proRata(policy, worked, month);
      lines.push({
        label,
        kind: 'earning',
        amount: share.apply(
          fromMinor(toMinor(salary.basePay) + toMinor(salary.allowances)),
        ),
        source: 'salary',
        note: share.note,
      });

      let unpaidDays = 0;
      for (const leave of await this.repository.unpaidLeave(
        separation.employeeId,
        from,
        lwd,
      )) {
        unpaidDays += await this.calendarService.workingDays(
          leave.startDate > from ? leave.startDate : from,
          leave.endDate < lwd ? leave.endDate : lwd,
        );
      }
      if (unpaidDays) {
        const { amount, note } = amountForDays(
          unpaidLeaveRule(policy),
          salary,
          month,
          unpaidDays,
        );
        lines.push({
          label: 'Unpaid leave',
          kind: 'deduction',
          amount,
          source: 'unpaid_leave',
          note,
        });
      }
    }

    for (const balance of await this.repository.encashableBalances(
      separation.employeeId,
      Number(lwd.slice(0, 4)),
    )) {
      if (balance.remainingDays <= 0) continue;
      const { amount, note } = amountForDays(
        encashmentRule(policy),
        salary,
        month,
        balance.remainingDays,
      );
      lines.push({
        label: `${balance.leaveTypeName} leave encashment`,
        kind: 'earning',
        amount,
        source: 'leave_encashment',
        note,
      });
    }
    return lines;
  }

  private async findOrThrow(id: number) {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException('Separation not found');
    return row;
  }

  private assertCurrent(status: string) {
    if ((SIGN_IN_BLOCKED_STATUSES as readonly string[]).includes(status)) {
      throw new ConflictException(`The employee has already left (${status})`);
    }
  }

  private assertAfterHire(lastWorkingDay: string, hiredAt: string) {
    if (lastWorkingDay < hiredAt) {
      throw new BadRequestException('lastWorkingDay is before the hire date');
    }
  }

  private async assertNotOwn(requester: JwtPayload, employeeId: number) {
    const me = await this.employeesService.findOptionalByUserId(requester.sub);
    if (me?.id === employeeId) {
      throw new ForbiddenException('You cannot process your own separation');
    }
  }

  private async record(verb: string, row: Separation) {
    await this.audit.record({
      action: `separation.${verb}`,
      entityType: 'separation',
      entityId: row.id,
      metadata: {
        employeeId: row.employeeId,
        type: row.type,
        lastWorkingDay: row.lastWorkingDay,
      },
    });
  }
}
