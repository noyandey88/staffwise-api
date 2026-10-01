import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  employeeBankAccounts,
  payrollRuns,
  payslips,
  salaryStructures,
} from '../database/schema/payroll.schema.js';
import { leaveRequests, leaveTypes } from '../database/schema/leave.schema.js';
import { employees } from '../database/schema/employees.schema.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';
import { monthRange } from '../attendance/attendance.util.js';

@Injectable()
export class PayrollRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async generate(month: string) {
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
      // plus approved unpaid-leave days that fall inside this month (a
      // leave spanning two months is split between them).
      const formerStaff = sql.join(
        SIGN_IN_BLOCKED_STATUSES.map((status) => sql`${status}`),
        sql`, `,
      );
      const rows = await tx.execute<{
        employeeId: number;
        basePay: string;
        allowances: string;
        unpaidLeaveDays: number;
      }>(sql`
        WITH current_salary AS (
          SELECT DISTINCT ON (ss.employee_id)
            ss.employee_id, ss.base_pay, ss.allowances
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
          COALESCE(SUM(
            LEAST(lr.end_date, ${end}::date - 1)
              - GREATEST(lr.start_date, ${start}::date) + 1
          ), 0)::int AS "unpaidLeaveDays"
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
        GROUP BY cs.employee_id, cs.base_pay, cs.allowances
      `);

      if (rows.rows.length === 0) {
        throw new NotFoundException(
          'No current employees with a salary effective by this month',
        );
      }

      const payslipValues = rows.rows.map((r) => {
        const basePay = Number(r.basePay);
        const allowances = Number(r.allowances);
        const perDayRate = basePay / 30; // simple assumption, worth revisiting
        const deductions = perDayRate * r.unpaidLeaveDays;
        const netPay = basePay + allowances - deductions;

        return {
          payrollRunId: run.id,
          employeeId: r.employeeId,
          basePay: r.basePay,
          allowances: r.allowances,
          deductions: deductions.toFixed(2),
          netPay: netPay.toFixed(2),
          unpaidLeaveDays: r.unpaidLeaveDays,
        };
      });

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
