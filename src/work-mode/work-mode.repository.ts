import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, or, type SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  workArrangements,
  type WorkArrangementScope,
} from '../database/schema/work-arrangement.schema.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';

@Injectable()
export class WorkModeRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(filter: {
    scope?: WorkArrangementScope;
    departmentId?: number;
    employeeId?: number;
  }) {
    const conditions: SQL[] = [];
    if (filter.scope) conditions.push(eq(workArrangements.scope, filter.scope));
    if (filter.departmentId !== undefined) {
      conditions.push(eq(workArrangements.departmentId, filter.departmentId));
    }
    if (filter.employeeId !== undefined) {
      conditions.push(eq(workArrangements.employeeId, filter.employeeId));
    }
    return this.db
      .select()
      .from(workArrangements)
      .where(and(...conditions))
      .orderBy(workArrangements.scope, desc(workArrangements.effectiveFrom));
  }

  /** Every row that could apply to this employee (any date). */
  async candidatesFor(employee: { id: number; departmentId: number }) {
    return this.db
      .select()
      .from(workArrangements)
      .where(
        or(
          eq(workArrangements.scope, 'company'),
          and(
            eq(workArrangements.scope, 'department'),
            eq(workArrangements.departmentId, employee.departmentId),
          ),
          and(
            eq(workArrangements.scope, 'employee'),
            eq(workArrangements.employeeId, employee.id),
          ),
        ),
      );
  }

  async findById(id: number) {
    return this.db.query.workArrangements.findFirst({
      where: eq(workArrangements.id, id),
    });
  }

  /** undefined when the same target already has one from that date. */
  async create(data: typeof workArrangements.$inferInsert) {
    try {
      const [row] = await this.db
        .insert(workArrangements)
        .values(data)
        .returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  async remove(id: number) {
    await this.db.delete(workArrangements).where(eq(workArrangements.id, id));
  }
}
