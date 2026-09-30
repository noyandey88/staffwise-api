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
import { and, eq, sql } from 'drizzle-orm';

/** Postgres exclusion-constraint violation (our overlap rule). */
const EXCLUSION_VIOLATION = '23P01';

@Injectable()
export class LeaveRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        err.code === EXCLUSION_VIOLATION
      ) {
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

  async balanceForEmployee(employeeId: number, year: number) {
    return await this.db
      .select({
        leavetypeId: leaveBalances.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        year: leaveBalances.year,
        remainingDays: leaveBalances.remainingDays,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.id))
      .where(
        and(
          eq(leaveBalances.employeeId, employeeId),
          eq(leaveBalances.year, year),
        ),
      );
  }

  async reject(requestId: number, reviewerEmployeeId: number) {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        reviewedBy: reviewerEmployeeId,
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

  async approve(requestId: number, reviewerEmployeeId: number) {
    return this.db.transaction(async (tx) => {
      const request = await tx.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, requestId),
      });

      if (!request) {
        throw new NotFoundException('Leave request not found');
      }

      if (request.status !== 'pending') {
        throw new ConflictException('Only pending requests can be approved');
      }

      const year = new Date(request.startDate).getFullYear();

      const balanceRows = await tx
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

      const balance = balanceRows[0];
      if (!balance || balance.remainingDays < request.days) {
        throw new ConflictException('Insufficient leave balance');
      }

      await tx
        .update(leaveBalances)
        .set({
          remainingDays: sql`${leaveBalances.remainingDays} - ${request.days}`,
        })
        .where(eq(leaveRequests.id, requestId));

      const [updated] = await tx
        .update(leaveRequests)
        .set({
          status: 'approved',
          reviewedBy: reviewerEmployeeId,
          reviewedAt: new Date(),
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      return updated;
    });
  }
}
