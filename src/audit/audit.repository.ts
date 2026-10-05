import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { activeTimezone } from '../attendance/attendance.util.js';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  auditLogs,
  type AuditChanges,
} from '../database/schema/audit-log.schema.js';
import { users } from '../database/schema/user.schema.js';
import type { PageWindow } from '../common/utils/pagination.util.js';

export interface AuditFilter {
  actorUserId?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  /** First local day (YYYY-MM-DD, organisation timezone), inclusive. */
  from?: string;
  /** Last local day, inclusive. */
  to?: string;
}

@Injectable()
export class AuditRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async insert(row: {
    actorUserId: number | null;
    action: string;
    entityType: string;
    entityId: string;
    changes: AuditChanges | null;
    metadata: Record<string, unknown> | null;
    ip: string | null;
  }) {
    await this.db.insert(auditLogs).values(row);
  }

  async findPage(filter: AuditFilter, window: PageWindow) {
    const conditions: SQL[] = [];
    if (filter.actorUserId !== undefined) {
      conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));
    }
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.entityType) {
      conditions.push(eq(auditLogs.entityType, filter.entityType));
    }
    if (filter.entityId)
      conditions.push(eq(auditLogs.entityId, filter.entityId));
    // Local midnight of a day as an instant: date::timestamp AT TIME ZONE tz.
    if (filter.from) {
      conditions.push(
        sql`${auditLogs.createdAt} >= (${filter.from}::date::timestamp AT TIME ZONE ${activeTimezone()}::text)`,
      );
    }
    if (filter.to) {
      conditions.push(
        sql`${auditLogs.createdAt} < ((${filter.to}::date + 1)::timestamp AT TIME ZONE ${activeTimezone()}::text)`,
      );
    }
    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          changes: auditLogs.changes,
          metadata: auditLogs.metadata,
          ip: auditLogs.ip,
          createdAt: auditLogs.createdAt,
          actorUserId: auditLogs.actorUserId,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(where)
        .orderBy(desc(auditLogs.id))
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(auditLogs).where(where),
    ]);
    return { items, total };
  }
}
