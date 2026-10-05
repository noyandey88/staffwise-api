import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PageWindow } from '../common/utils/pagination.util.js';
import type { PayrollRunStatus } from './dto/payroll-run-query.dto.js';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  employeeBankAccounts,
  employeePayComponents,
  payComponents,
  type PayslipLine,
  payrollRuns,
  payslips,
  salaryStructures,
} from '../database/schema/payroll.schema.js';
import {
  type AppliedComponent,
  componentLine,
  payslipTotals,
  unpaidLeaveLine,
} from './payslip.calc.js';
import { type DayCounts, type PolicyRules, proRata } from './policy.calc.js';
import { leaveRequests, leaveTypes } from '../database/schema/leave.schema.js';
import { employees } from '../database/schema/employees.schema.js';
import { users } from '../database/schema/user.schema.js';
import { departments } from '../database/schema/departments.schema.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';
import { monthRange } from '../attendance/attendance.util.js';
import { holidays } from '../database/schema/holiday.schema.js';
import { notWeekend } from '../calendar/calendar.repository.js';

const getRunColumns = () => ({
  id: payrollRuns.id,
  month: payrollRuns.month,
  status: payrollRuns.status,
  generatedAt: payrollRuns.generatedAt,
  approvedAt: payrollRuns.approvedAt,
  approvedBy: payrollRuns.approvedBy,
});

@Injectable()
export class PayrollRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * `policy` decides unpaid-leave rates and joiner pro-rata; `month` holds
   * the month's calendar/working day counts; `workingDaysBetween` counts a
   * joiner's working days (only called when the policy needs it).
   */
  async generate(
    month: string,
    ctx: {
      policy: PolicyRules;
      month: DayCounts & { end: string };
      workingDaysBetween: (from: string, to: string) => Promise<number>;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const { start, end } = monthRange(month);
      const existing = await tx.query.payrollRuns.findFirst({
        where: eq(payrollRuns.month, start),
      });
      if (existing) {
        throw new ConflictException(
          `A payroll run for ${month} already exists`,
        );
      }

      const [run] = await tx
        .insert(payrollRuns)
        .values({ month: start, status: 'draft' })
        .returning();

      // Latest salary effective by month end, for current staff only,
      // plus approved unpaid-leave working days that fall inside this month
      // (a leave spanning two months is split between them; weekends and
      // public holidays are not deducted).
      const formerStaff = sql.join(
        SIGN_IN_BLOCKED_STATUSES.map((status) => sql`${status}`),
        sql`, `,
      );
      const rows = await tx.execute<{
        employeeId: number;
        basePay: string;
        allowances: string;
        hiredAt: string;
        unpaidLeaveDays: number;
      }>(sql`
        WITH current_salary AS (
          SELECT DISTINCT ON (ss.employee_id)
            ss.employee_id, ss.base_pay, ss.allowances, e.hired_at
          FROM ${salaryStructures} ss
          JOIN ${employees} e ON e.id = ss.employee_id
          WHERE ss.effective_from < ${end}::date
            AND e.status NOT IN (${formerStaff})
          ORDER BY ss.employee_id, ss.effective_from DESC
        )
        SELECT
          cs.employee_id AS "employeeId",
          cs.base_pay AS "basePay",
          cs.allowances AS "allowances",
          to_char(cs.hired_at, 'YYYY-MM-DD') AS "hiredAt",
          COALESCE(SUM(wd.days), 0)::int AS "unpaidLeaveDays"
        FROM current_salary cs
        LEFT JOIN (
          ${leaveRequests} lr
          JOIN ${leaveTypes} lt
            ON lt.id = lr.leave_type_id AND NOT lt.is_paid
        )
          ON lr.employee_id = cs.employee_id
          AND lr.status = 'approved'
          AND lr.start_date < ${end}::date
          AND lr.end_date >= ${start}::date
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS days
          FROM generate_series(
            GREATEST(lr.start_date, ${start}::date),
            LEAST(lr.end_date, ${end}::date - 1),
            interval '1 day'
          ) AS d
          -- No leave row means nothing to count: GREATEST/LEAST skip NULLs,
          -- so without this the series would span the whole month.
          WHERE lr.id IS NOT NULL
            AND ${notWeekend(sql`d`)}
            AND NOT EXISTS (SELECT 1 FROM ${holidays} h WHERE h.date = d::date)
        ) wd ON true
        GROUP BY cs.employee_id, cs.base_pay, cs.allowances, cs.hired_at
      `);

      if (rows.rows.length === 0) {
        throw new NotFoundException(
          'No current employees with a salary effective by this month',
        );
      }

      // Components in force this month: an employee's own assignment wins
      // (latest effective_from if several overlap); otherwise components
      // that apply to everyone, at their default value.
      const employeeIds = rows.rows.map((r) => r.employeeId);
      const [components, assignments] = await Promise.all([
        tx.select().from(payComponents).where(eq(payComponents.isActive, true)),
        tx
          .select()
          .from(employeePayComponents)
          .where(
            and(
              inArray(employeePayComponents.employeeId, employeeIds),
              lt(employeePayComponents.effectiveFrom, end),
              sql`(${employeePayComponents.effectiveTo} IS NULL OR ${employeePayComponents.effectiveTo} >= ${start}::date)`,
            ),
          )
          .orderBy(asc(employeePayComponents.effectiveFrom)),
      ]);
      const assigned = new Map<string, (typeof assignments)[number]>();
      for (const a of assignments) {
        assigned.set(`${a.employeeId}:${a.componentId}`, a); // later rows win
      }

      const { policy } = ctx;
      const negative: number[] = [];
      const payslipValues: (typeof payslips.$inferInsert)[] = [];
      for (const r of rows.rows) {
        // Joined during this month: pay only the share worked (policy).
        let basePay = r.basePay;
        let allowances = r.allowances;
        let proRataNote: string | null = null;
        let scaleFixed = (amount: string) => amount;
        if (policy.prorateJoiners && r.hiredAt > start) {
          const worked = {
            calendarDays:
              Number(ctx.month.end.slice(8, 10)) -
              Number(r.hiredAt.slice(8, 10)) +
              1,
            workingDays:
              policy.proRataMethod === 'working_days'
                ? await ctx.workingDaysBetween(r.hiredAt, ctx.month.end)
                : 0,
          };
          const share = proRata(policy, worked, ctx.month);
          basePay = share.apply(r.basePay);
          allowances = share.apply(r.allowances);
          proRataNote = `Joined ${r.hiredAt}: ${share.note}`;
          if (policy.prorateFixedComponents) scaleFixed = share.apply;
        }

        const lines: PayslipLine[] = [];
        if (r.unpaidLeaveDays > 0) {
          // Daily rate from the full monthly salary, not the pro-rated one.
          lines.push(unpaidLeaveLine(policy, r, ctx.month, r.unpaidLeaveDays));
        }
        for (const component of components) {
          const assignment = assigned.get(`${r.employeeId}:${component.id}`);
          if (!assignment && !component.appliesToAll) continue;
          const applied: AppliedComponent = {
            component,
            value: assignment?.value ?? component.defaultValue,
          };
          const line = componentLine(applied, basePay, allowances);
          if (component.calculation === 'fixed') {
            line.amount = scaleFixed(line.amount);
          }
          if (Number(line.amount) > 0) lines.push(line);
        }
        const totals = payslipTotals(basePay, allowances, lines);
        if (totals.negative) negative.push(r.employeeId);

        payslipValues.push({
          payrollRunId: run.id,
          employeeId: r.employeeId,
          basePay,
          allowances,
          grossPay: totals.grossPay,
          deductions: totals.deductions,
          netPay: totals.netPay,
          lines,
          unpaidLeaveDays: r.unpaidLeaveDays,
          proRataNote,
        });
      }

      if (negative.length) {
        throw new ConflictException(
          `Deductions exceed gross pay for employee(s) ${negative.join(', ')}; ` +
            'adjust their components before generating the run',
        );
      }

      await tx.insert(payslips).values(payslipValues);

      return run;
    });
  }

  /**
   * Draft -> approved. Copies each employee's primary bank account onto
   * their payslip so later account edits don't change what gets paid;
   * refuses (409) while any employee on the run lacks a primary account.
   */
  async approve(runId: number, approverUserId: number) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(payrollRuns)
        .where(eq(payrollRuns.id, runId))
        .for('update');
      if (!run) {
        throw new NotFoundException(`Payroll run with id ${runId} not found`);
      }
      if (run.status !== 'draft') {
        throw new ConflictException('Only draft runs can be approved');
      }

      await tx.execute(sql`
        UPDATE ${payslips} ps
        SET
          bank_account_holder_name = a.account_holder_name,
          bank_name = a.bank_name,
          bank_branch_name = a.branch_name,
          bank_account_number = a.account_number,
          bank_routing_number = a.routing_number,
          updated_at = now()
        FROM ${employeeBankAccounts} a
        WHERE a.employee_id = ps.employee_id
          AND a.is_primary
          AND ps.payroll_run_id = ${runId}
      `);

      const missing = await tx
        .select({ employeeId: payslips.employeeId })
        .from(payslips)
        .where(
          and(
            eq(payslips.payrollRunId, runId),
            isNull(payslips.bankAccountNumber),
          ),
        );
      if (missing.length > 0) {
        throw new ConflictException(
          `No primary bank account for employee id(s): ${missing
            .map((m) => m.employeeId)
            .join(', ')}`,
        );
      }

      const [updated] = await tx
        .update(payrollRuns)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: approverUserId,
        })
        .where(eq(payrollRuns.id, runId))
        .returning();
      return updated;
    });
  }

  async markPaid(runId: number) {
    const [updated] = await this.db
      .update(payrollRuns)
      .set({ status: 'paid' })
      .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.status, 'approved')))
      .returning();
    if (!updated)
      throw new ConflictException('Only approved runs can be marked paid');
    return updated;
  }

  private readonly runTotals = {
    payslipCount: sql<number>`count(${payslips.id})::int`,
    totalGross: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::numeric(14,2)::text`,
    totalDeductions: sql<string>`coalesce(sum(${payslips.deductions}), 0)::numeric(14,2)::text`,
    totalNet: sql<string>`coalesce(sum(${payslips.netPay}), 0)::numeric(14,2)::text`,
  };

  /** Runs newest month first, each with payslip totals. */
  async findRunPage(
    filter: { status?: PayrollRunStatus; year?: number },
    window: PageWindow,
  ) {
    const conditions: SQL[] = [];
    if (filter.status) conditions.push(eq(payrollRuns.status, filter.status));
    if (filter.year !== undefined) {
      conditions.push(
        gte(payrollRuns.month, `${filter.year}-01-01`),
        lt(payrollRuns.month, `${filter.year + 1}-01-01`),
      );
    }
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({ ...getRunColumns(), ...this.runTotals })
        .from(payrollRuns)
        .leftJoin(payslips, eq(payslips.payrollRunId, payrollRuns.id))
        .where(where)
        .groupBy(payrollRuns.id)
        .orderBy(desc(payrollRuns.month))
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(payrollRuns).where(where),
    ]);
    return { items, total };
  }

  async findRunSummary(runId: number) {
    const [row] = await this.db
      .select({ ...getRunColumns(), ...this.runTotals })
      .from(payrollRuns)
      .leftJoin(payslips, eq(payslips.payrollRunId, payrollRuns.id))
      .where(eq(payrollRuns.id, runId))
      .groupBy(payrollRuns.id);
    return row;
  }

  /** Deletes a draft run and its payslips; false if it isn't a draft (any more). */
  async deleteDraft(runId: number): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(payrollRuns)
        .where(eq(payrollRuns.id, runId))
        .for('update');
      if (!run || run.status !== 'draft') return false;
      await tx.delete(payslips).where(eq(payslips.payrollRunId, runId));
      await tx.delete(payrollRuns).where(eq(payrollRuns.id, runId));
      return true;
    });
  }

  async findRun(runId: number) {
    return this.db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    });
  }

  async payslipsForRun(runId: number) {
    return this.db.query.payslips.findMany({
      where: eq(payslips.payrollRunId, runId),
      orderBy: asc(payslips.employeeId),
    });
  }

  /**
   * Replaces a draft-run payslip's one-off adjustment lines and recomputes
   * its totals. undefined when the payslip doesn't exist; throws 409 when
   * the run is no longer a draft or net pay would go negative.
   */
  async setAdjustments(payslipId: number, adjustments: PayslipLine[]) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ payslip: payslips, status: payrollRuns.status })
        .from(payslips)
        .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.payrollRunId))
        .where(eq(payslips.id, payslipId))
        .for('update');
      if (!row) return undefined;
      if (row.status !== 'draft') {
        throw new ConflictException(
          'Adjustments are only possible while the run is a draft',
        );
      }
      const slip = row.payslip;
      const lines = [
        ...slip.lines.filter((l) => l.source !== 'adjustment'),
        ...adjustments,
      ];
      const totals = payslipTotals(slip.basePay, slip.allowances, lines);
      if (totals.negative) {
        throw new ConflictException('Deductions would exceed gross pay');
      }
      const [updated] = await tx
        .update(payslips)
        .set({
          lines,
          grossPay: totals.grossPay,
          deductions: totals.deductions,
          netPay: totals.netPay,
        })
        .where(eq(payslips.id, payslipId))
        .returning();
      return { before: slip, after: updated };
    });
  }

  /** A payslip with its run and the employee's details, for the PDF. */
  async findPayslipDetail(id: number) {
    const [row] = await this.db
      .select({
        payslip: payslips,
        run: payrollRuns,
        employee: {
          userId: employees.userId,
          employeeCode: employees.employeeCode,
          jobTitle: employees.jobTitle,
          firstName: users.firstName,
          lastName: users.lastName,
          departmentName: departments.name,
        },
      })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.payrollRunId))
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .innerJoin(departments, eq(departments.id, employees.departmentId))
      .where(eq(payslips.id, id));
    return row;
  }

  /** Released payslips only: drafts can still change before approval. */
  async payslipsForEmployee(employeeId: number) {
    const rows = await this.db
      .select({ payslip: payslips })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.payrollRunId))
      .where(
        and(
          eq(payslips.employeeId, employeeId),
          inArray(payrollRuns.status, ['approved', 'paid']),
        ),
      )
      .orderBy(desc(payrollRuns.month));
    return rows.map((r) => r.payslip);
  }
}
