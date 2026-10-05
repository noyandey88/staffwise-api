import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  and,
  count,
  desc,
  eq,
  gt,
  isNull,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import type { PageWindow } from '../common/utils/pagination.util.js';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type NewNotice,
  type Notice,
  notices,
} from '../database/schema/notice.schema.js';

@Injectable()
export class NoticeRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: NewNotice): Promise<Notice> {
    const [notice] = await this.db.insert(notices).values(data).returning();
    return notice;
  }

  async findById(id: number): Promise<Notice | undefined> {
    return this.db.query.notices.findFirst({ where: eq(notices.id, id) });
  }

  /** Every notice, scheduled and expired included (management view). */
  async findPage(window: PageWindow) {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(notices)
        .orderBy(desc(notices.publishedAt), desc(notices.id))
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(notices),
    ]);
    return { items, total };
  }

  /**
   * Notices live at `now`. `departmentId` undefined returns every live
   * notice; otherwise company-wide ones plus that department's (null
   * department = company-wide only).
   */
  async findActive(now: Date, departmentId?: number | null): Promise<Notice[]> {
    const conditions: (SQL | undefined)[] = [
      lte(notices.publishedAt, now),
      or(isNull(notices.expiresAt), gt(notices.expiresAt, now)),
    ];
    if (departmentId !== undefined) {
      conditions.push(
        departmentId === null
          ? isNull(notices.departmentId)
          : or(
              isNull(notices.departmentId),
              eq(notices.departmentId, departmentId),
            ),
      );
    }

    return this.db
      .select()
      .from(notices)
      .where(and(...conditions))
      .orderBy(
        desc(notices.pinned),
        desc(notices.publishedAt),
        desc(notices.id),
      );
  }

  async update(
    id: number,
    data: Partial<Omit<NewNotice, 'id'>>,
  ): Promise<Notice | undefined> {
    const [notice] = await this.db
      .update(notices)
      .set(data)
      .where(eq(notices.id, id))
      .returning();
    return notice;
  }

  async remove(id: number): Promise<void> {
    await this.db.delete(notices).where(eq(notices.id, id));
  }
}
