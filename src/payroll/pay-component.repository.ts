import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  employeePayComponents,
  payComponents,
} from '../database/schema/payroll.schema.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';

@Injectable()
export class PayComponentRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(payComponents)
      .orderBy(asc(payComponents.name));
  }

  async findById(id: number) {
    return this.db.query.payComponents.findFirst({
      where: eq(payComponents.id, id),
    });
  }

  /** undefined when the name is taken. */
  async create(data: typeof payComponents.$inferInsert) {
    try {
      const [row] = await this.db
        .insert(payComponents)
        .values(data)
        .returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  /** null when the new name is taken. */
  async update(id: number, data: Partial<typeof payComponents.$inferInsert>) {
    try {
      const [row] = await this.db
        .update(payComponents)
        .set(data)
        .where(eq(payComponents.id, id))
        .returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return null;
      throw err;
    }
  }

  async findAssignments(employeeId: number) {
    return this.db
      .select({
        id: employeePayComponents.id,
        employeeId: employeePayComponents.employeeId,
        componentId: employeePayComponents.componentId,
        componentName: payComponents.name,
        value: employeePayComponents.value,
        effectiveFrom: employeePayComponents.effectiveFrom,
        effectiveTo: employeePayComponents.effectiveTo,
      })
      .from(employeePayComponents)
      .innerJoin(
        payComponents,
        eq(payComponents.id, employeePayComponents.componentId),
      )
      .where(eq(employeePayComponents.employeeId, employeeId))
      .orderBy(
        asc(payComponents.name),
        asc(employeePayComponents.effectiveFrom),
      );
  }

  async findAssignment(id: number) {
    return this.db.query.employeePayComponents.findFirst({
      where: eq(employeePayComponents.id, id),
    });
  }

  async createAssignment(data: typeof employeePayComponents.$inferInsert) {
    const [row] = await this.db
      .insert(employeePayComponents)
      .values(data)
      .returning();
    return row;
  }

  async updateAssignment(
    id: number,
    data: Partial<typeof employeePayComponents.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(employeePayComponents)
      .set(data)
      .where(eq(employeePayComponents.id, id))
      .returning();
    return row;
  }

  async removeAssignment(id: number) {
    await this.db
      .delete(employeePayComponents)
      .where(eq(employeePayComponents.id, id));
  }
}
