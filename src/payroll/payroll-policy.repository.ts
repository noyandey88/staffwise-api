import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { payrollPolicy } from '../database/schema/payroll.schema.js';

@Injectable()
export class PayrollPolicyRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async find() {
    return this.db.query.payrollPolicy.findFirst();
  }

  /** Creates the single row on first save; only given fields change. */
  async save(data: Partial<typeof payrollPolicy.$inferInsert>) {
    const [row] = await this.db
      .insert(payrollPolicy)
      .values({ ...data, id: 1 })
      .onConflictDoUpdate({ target: payrollPolicy.id, set: data })
      .returning();
    return row;
  }
}
