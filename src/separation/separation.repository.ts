import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  finalSettlements,
  type Separation,
  separations,
  type SettlementLine,
} from '../database/schema/separation.schema.js';
import { employees } from '../database/schema/employees.schema.js';
import { refreshTokens } from '../database/schema/refresh-token.schema.js';
import {
  payrollRuns,
  payslips,
  salaryStructures,
} from '../database/schema/payroll.schema.js';
import {
  leaveBalances,
  leaveRequests,
  leaveTypes,
} from '../database/schema/leave.schema.js';
import { EmployeeStatus } from '../employees/employees.enum.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';
import type { PageWindow } from '../common/utils/pagination.util.js';

export type SeparationType = Separation['type'];
export type SeparationStatus = Separation['status'];

/** Employee status a completed separation sets. */
const STATUS_AFTER: Record<SeparationType, EmployeeStatus> = {
  resignation: EmployeeStatus.Resigned,
  termination: EmployeeStatus.Terminated,
  retirement: EmployeeStatus.Retired,
};

@Injectable()
export class SeparationRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** undefined when the employee already has an open separation. */
  async create(data: typeof separations.$inferInsert) {
    try {
      const [row] = await this.db.insert(separations).values(data).returning();
      return row;
    } catch (err: unknown) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  async findById(id: number) {
    return this.db.query.separations.findFirst({
      where: eq(separations.id, id),
    });
  }

  async findByEmployee(employeeId: number) {
    return this.db
      .select()
      .from(separations)
      .where(eq(separations.employeeId, employeeId))
      .orderBy(desc(separations.id));
  }

  async findPage(
    filter: { status?: SeparationStatus; type?: SeparationType },
    window: PageWindow,
  ) {
    const conditions: SQL[] = [];
    if (filter.status) conditions.push(eq(separations.status, filter.status));
    if (filter.type) conditions.push(eq(separations.type, filter.type));
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(separations)
        .where(where)
        .orderBy(desc(separations.lastWorkingDay), desc(separations.id))
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(separations).where(where),
    ]);
    return { items, total };
  }

  /** Moves a separation from one status to another; undefined if it wasn't in `from`. */
  async transition(
    id: number,
    from: SeparationStatus[],
    set: Partial<typeof separations.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(separations)
      .set(set)
      .where(and(eq(separations.id, id), inArray(separations.status, from)))
      .returning();
    return row;
  }

  /** Approved separations whose last working day is before `today`. */
  async findDue(today: string) {
    return this.db
      .select()
      .from(separations)
      .where(
        and(
          eq(separations.status, 'approved'),
          lt(separations.lastWorkingDay, today),
        ),
      );
  }

  /**
   * Applies a due separation: employee status, sign-out everywhere, and
   * the separation marked completed. Skips it if it's no longer approved.
   */
  async complete(separation: Separation): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [done] = await tx
        .update(separations)
        .set({ status: 'completed', completedAt: new Date() })
        .where(
          and(
            eq(separations.id, separation.id),
            eq(separations.status, 'approved'),
          ),
        )
        .returning();
      if (!done) return false;
      const [employee] = await tx
        .update(employees)
        .set({ status: STATUS_AFTER[separation.type] })
        .where(eq(employees.id, separation.employeeId))
        .returning({ userId: employees.userId });
      await tx
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.userId, employee.userId));
      return true;
    });
  }

  // --- settlement inputs ---

  async salaryOn(employeeId: number, date: string) {
    const [row] = await this.db
      .select()
      .from(salaryStructures)
      .where(
        and(
          eq(salaryStructures.employeeId, employeeId),
          lte(salaryStructures.effectiveFrom, date),
        ),
      )
      .orderBy(desc(salaryStructures.effectiveFrom))
      .limit(1);
    return row;
  }

  /** Whether a payroll run for `monthStart` already pays this employee. */
  async hasPayslipForMonth(employeeId: number, monthStart: string) {
    const [row] = await this.db
      .select({ id: payslips.id })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.payrollRunId))
      .where(
        and(
          eq(payslips.employeeId, employeeId),
          eq(payrollRuns.month, monthStart),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async encashableBalances(employeeId: number, year: number) {
    return this.db
      .select({
        leaveTypeName: leaveTypes.name,
        remainingDays: leaveBalances.remainingDays,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
      .where(
        and(
          eq(leaveBalances.employeeId, employeeId),
          eq(leaveBalances.year, year),
          eq(leaveTypes.isPaid, true),
          eq(leaveTypes.isEncashable, true),
        ),
      );
  }

  /** Approved unpaid leave overlapping [start, end] (inclusive dates). */
  async unpaidLeave(employeeId: number, start: string, end: string) {
    return this.db
      .select({
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, 'approved'),
          eq(leaveTypes.isPaid, false),
          lte(leaveRequests.startDate, end),
          gte(leaveRequests.endDate, start),
        ),
      );
  }

  // --- settlement ---

  async findSettlement(separationId: number) {
    return this.db.query.finalSettlements.findFirst({
      where: eq(finalSettlements.separationId, separationId),
    });
  }

  /** Creates or replaces a draft; finalized/paid settlements are left alone. */
  async saveDraft(data: {
    separationId: number;
    employeeId: number;
    currency: string;
    lines: SettlementLine[];
    totalEarnings: string;
    totalDeductions: string;
    netPay: string;
  }) {
    const [row] = await this.db
      .insert(finalSettlements)
      .values(data)
      .onConflictDoUpdate({
        target: finalSettlements.separationId,
        set: {
          currency: data.currency,
          lines: data.lines,
          totalEarnings: data.totalEarnings,
          totalDeductions: data.totalDeductions,
          netPay: data.netPay,
        },
        setWhere: eq(finalSettlements.status, 'draft'),
      })
      .returning();
    return row;
  }

  async transitionSettlement(
    separationId: number,
    from: 'draft' | 'finalized',
    set: Partial<typeof finalSettlements.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(finalSettlements)
      .set(set)
      .where(
        and(
          eq(finalSettlements.separationId, separationId),
          eq(finalSettlements.status, from),
        ),
      )
      .returning();
    return row;
  }
}
