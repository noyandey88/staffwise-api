import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import { leaveRequests } from '../database/schema/index.js';
import { leaveBalances } from '../database/schema/index.js';
import { leaveTypes } from '../database/schema/index.js';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  type LeaveType,
  type NewLeaveType,
} from '../database/schema/leave.schema.js';
import {
  isPgError,
  PG_EXCLUSION_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';

export type LeaveStatus = (typeof leaveRequests.status.enumValues)[number];

export interface LeaveRequestFilter {
  /** undefined = every employee. */
  employeeIds?: number[];
  status?: LeaveStatus;
  /** Requests starting in this year. */
  year?: number;
}

@Injectable()
export class LeaveRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // --- leave types ---

  async findTypes(): Promise<LeaveType[]> {
    return this.db.select().from(leaveTypes).orderBy(asc(leaveTypes.name));
  }

  async findTypeById(id: number): Promise<LeaveType | undefined> {
    return this.db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, id) });
  }

  /** undefined when the name is taken. */
  async createType(data: NewLeaveType): Promise<LeaveType | undefined> {
    const [type] = await this.db
      .insert(leaveTypes)
      .values(data)
      .onConflictDoNothing({ target: leaveTypes.name })
      .returning();
    return type;
  }

  /** null when the new name is taken. */
  async updateType(
    id: number,
    data: Partial<Omit<NewLeaveType, 'id'>>,
  ): Promise<LeaveType | undefined | null> {
    try {
      const [type] = await this.db
        .update(leaveTypes)
        .set(data)
        .where(eq(leaveTypes.id, id))
        .returning();
      return type;
    } catch (err: unknown) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return null;
      throw err;
    }
  }

  // --- balances ---

  /** Creates missing (employee, type, year) balances; existing ones are kept. */
  async allocate(
    year: number,
    employeeIds: number[],
    types: Pick<LeaveType, 'id' | 'defaultDaysPerYear'>[],
  ): Promise<number> {
    if (employeeIds.length === 0 || types.length === 0) return 0;
    const rows = await this.db
      .insert(leaveBalances)
      .values(
        employeeIds.flatMap((employeeId) =>
          types.map((t) => ({
            employeeId,
            leaveTypeId: t.id,
            year,
            remainingDays: t.defaultDaysPerYear,
          })),
        ),
      )
      .onConflictDoNothing({
        target: [
          leaveBalances.employeeId,
          leaveBalances.leaveTypeId,
          leaveBalances.year,
        ],
      })
      .returning({ id: leaveBalances.id });
    return rows.length;
  }

  async setBalance(
    employeeId: number,
    leaveTypeId: number,
    year: number,
    remainingDays: number,
  ) {
    const [balance] = await this.db
      .insert(leaveBalances)
      .values({ employeeId, leaveTypeId, year, remainingDays })
      .onConflictDoUpdate({
        target: [
          leaveBalances.employeeId,
          leaveBalances.leaveTypeId,
          leaveBalances.year,
        ],
        set: { remainingDays },
      })
      .returning();
    return balance;
  }

  async findBalance(employeeId: number, leaveTypeId: number, year: number) {
    return this.db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year),
      ),
    });
  }

  async balanceForEmployee(employeeId: number, year: number) {
    return await this.db
      .select({
        leaveTypeId: leaveBalances.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        year: leaveBalances.year,
        remainingDays: leaveBalances.remainingDays,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
      .where(
        and(
          eq(leaveBalances.employeeId, employeeId),
          eq(leaveBalances.year, year),
        ),
      )
      .orderBy(asc(leaveTypes.name));
  }

  // --- requests ---

  async create(
    employeeId: number,
    data: {
      leaveTypeId: number;
      startDate: string;
      endDate: string;
      days: number;
      reason?: string;
    },
  ) {
    try {
      const [request] = await this.db
        .insert(leaveRequests)
        .values({ employeeId, ...data })
        .returning();

      return request;
    } catch (err: unknown) {
      if (isPgError(err, PG_EXCLUSION_VIOLATION)) {
        throw new ConflictException(
          'This overlaps an existing pending or approved leave request',
        );
      }
      throw err;
    }
  }

  async findById(id: number) {
    return await this.db.query.leaveRequests.findFirst({
      where: eq(leaveRequests.id, id),
    });
  }

  async findByEmployee(employeeId: number) {
    return await this.db.query.leaveRequests.findMany({
      where: eq(leaveRequests.employeeId, employeeId),
      orderBy: (t, { desc }) => desc(t.id),
    });
  }

  async findPendingForEmployees(employeeIds: number[]) {
    if (employeeIds.length === 0) return [];
    return this.db.query.leaveRequests.findMany({
      where: (t, { and, eq, inArray }) =>
        and(eq(t.status, 'pending'), inArray(t.employeeId, employeeIds)),
      orderBy: (t, { asc }) => asc(t.createdAt),
    });
  }

  async findRequests(filter: LeaveRequestFilter) {
    if (filter.employeeIds?.length === 0) return [];
    const conditions: SQL[] = [];
    if (filter.employeeIds) {
      conditions.push(inArray(leaveRequests.employeeId, filter.employeeIds));
    }
    if (filter.status) conditions.push(eq(leaveRequests.status, filter.status));
    if (filter.year !== undefined) {
      conditions.push(
        gte(leaveRequests.startDate, `${filter.year}-01-01`),
        lt(leaveRequests.startDate, `${filter.year + 1}-01-01`),
      );
    }
    return this.db
      .select()
      .from(leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.startDate), desc(leaveRequests.id));
  }

  /** Cancels the employee's own pending request; undefined if not possible. */
  async cancel(requestId: number, employeeId: number) {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(leaveRequests.id, requestId),
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, 'pending'),
        ),
      )
      .returning();
    return updated;
  }

  async reject(requestId: number, reviewerUserId: number) {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(leaveRequests.id, requestId),
          eq(leaveRequests.status, 'pending'),
        ),
      )
      .returning();

    if (!updated)
      throw new ConflictException('Only pending requests can be rejected');

    return updated;
  }

  /** Paid leave is deducted from the balance; unpaid leave is not tracked there. */
  async approve(requestId: number, reviewerUserId: number) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId))
        .for('update');

      if (!request) {
        throw new NotFoundException('Leave request not found');
      }

      if (request.status !== 'pending') {
        throw new ConflictException('Only pending requests can be approved');
      }

      const type = await tx.query.leaveTypes.findFirst({
        where: eq(leaveTypes.id, request.leaveTypeId),
      });

      if (type?.isPaid) {
        const year = Number(request.startDate.slice(0, 4));
        const [balance] = await tx
          .select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.employeeId, request.employeeId),
              eq(leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(leaveBalances.year, year),
            ),
          )
          .for('update');

        if (!balance || balance.remainingDays < request.days) {
          throw new ConflictException('Insufficient leave balance');
        }

        await tx
          .update(leaveBalances)
          .set({
            remainingDays: sql`${leaveBalances.remainingDays} - ${request.days}`,
          })
          .where(eq(leaveBalances.id, balance.id));
      }

      const [updated] = await tx
        .update(leaveRequests)
        .set({
          status: 'approved',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      return updated;
    });
  }
}
