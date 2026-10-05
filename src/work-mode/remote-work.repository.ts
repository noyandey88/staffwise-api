import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { remoteWorkRequests } from '../database/schema/remote-work.schema.js';
import {
  isPgError,
  PG_EXCLUSION_VIOLATION,
} from '../common/utils/pg-error.util.js';
import type { PageWindow } from '../common/utils/pagination.util.js';
import type { RemoteWorkStatus } from './dto/remote-work.dto.js';

@Injectable()
export class RemoteWorkRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** undefined when it overlaps a pending/approved request. */
  async create(data: typeof remoteWorkRequests.$inferInsert) {
    try {
      const [row] = await this.db
        .insert(remoteWorkRequests)
        .values(data)
        .returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_EXCLUSION_VIOLATION)) return undefined;
      throw err;
    }
  }

  async findById(id: number) {
    return this.db.query.remoteWorkRequests.findFirst({
      where: eq(remoteWorkRequests.id, id),
    });
  }

  async findByEmployee(employeeId: number) {
    return this.db
      .select()
      .from(remoteWorkRequests)
      .where(eq(remoteWorkRequests.employeeId, employeeId))
      .orderBy(desc(remoteWorkRequests.startDate));
  }

  async findPage(
    filter: { employeeIds?: number[]; status?: RemoteWorkStatus },
    window: PageWindow,
  ) {
    if (filter.employeeIds?.length === 0) return { items: [], total: 0 };
    const conditions: SQL[] = [];
    if (filter.employeeIds) {
      conditions.push(
        inArray(remoteWorkRequests.employeeId, filter.employeeIds),
      );
    }
    if (filter.status)
      conditions.push(eq(remoteWorkRequests.status, filter.status));
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(remoteWorkRequests)
        .where(where)
        .orderBy(
          desc(remoteWorkRequests.startDate),
          desc(remoteWorkRequests.id),
        )
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(remoteWorkRequests).where(where),
    ]);
    return { items, total };
  }

  /** Whether an approved request covers the date. */
  async approvedOn(employeeId: number, date: string) {
    const [row] = await this.db
      .select({ id: remoteWorkRequests.id })
      .from(remoteWorkRequests)
      .where(
        and(
          eq(remoteWorkRequests.employeeId, employeeId),
          eq(remoteWorkRequests.status, 'approved'),
          lte(remoteWorkRequests.startDate, date),
          gte(remoteWorkRequests.endDate, date),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  /** Moves a pending request on; undefined if it is no longer pending (or not theirs). */
  async decide(
    id: number,
    set: Partial<typeof remoteWorkRequests.$inferInsert>,
    employeeId?: number,
  ) {
    const [row] = await this.db
      .update(remoteWorkRequests)
      .set(set)
      .where(
        and(
          eq(remoteWorkRequests.id, id),
          eq(remoteWorkRequests.status, 'pending'),
          employeeId === undefined
            ? undefined
            : eq(remoteWorkRequests.employeeId, employeeId),
        ),
      )
      .returning();
    return row;
  }
}
