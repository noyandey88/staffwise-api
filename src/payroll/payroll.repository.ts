// payroll.repository.ts
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  payrollRuns,
  payslips,
  salaryStructures,
} from '../database/schema/payroll.schema.js';
import { leaveRequests } from '../database/schema/leave.schema.js';

@Injectable()
export class PayrollRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async generate(month: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.payrollRuns.findFirst({
        where: eq(payrollRuns.month, month),
      });
      if (existing) {
        throw new ConflictException(
          `A payroll run for ${month} already exists`,
        );
      }

      const [run] = await tx
        .insert(payrollRuns)
        .values({ month, status: 'draft' })
        .returning();

      const { start, end } = this.monthRange(month);

      // One salary structure row per active employee, plus unpaid-leave days taken this month.
      const rows = await tx.execute<{
        employeeId: number;
        basePay: string;
        allowances: string;
        unpaidLeaveDays: number;
      }>(sql`
        SELECT
          ss.employee_id AS "employeeId",
          ss.base_pay AS "basePay",
          ss.allowances AS "allowances",
          COALESCE(SUM(
            CASE WHEN lr.status = 'approved' AND lt.name = 'Unpaid'
            THEN lr.days ELSE 0 END
          ), 0)::int AS "unpaidLeaveDays"
        FROM ${salaryStructures} ss
        LEFT JOIN ${leaveRequests} lr
          ON lr.employee_id = ss.employee_id
          AND lr.start_date >= ${start}::date AND lr.start_date < ${end}::date
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        GROUP BY ss.employee_id, ss.base_pay, ss.allowances
      `);

      if (rows.rows.length === 0) {
        throw new NotFoundException(
          'No salary structures found to generate payroll from',
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

  async approve(runId: number, approverEmployeeId: number) {
    const [updated] = await this.db
      .update(payrollRuns)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverEmployeeId,
      })
      .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.status, 'draft')))
      .returning();
    if (!updated)
      throw new ConflictException('Only draft runs can be approved');
    return updated;
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

  async payslipsForRun(runId: number) {
    return this.db.query.payslips.findMany({
      where: eq(payslips.payrollRunId, runId),
    });
  }

  async payslipsForEmployee(employeeId: number) {
    return this.db.query.payslips.findMany({
      where: eq(payslips.employeeId, employeeId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
  }

  private monthRange(month: string) {
    const [y, m] = month.split('-').map(Number);
    const end =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { start: `${month}-01`, end };
  }
}
