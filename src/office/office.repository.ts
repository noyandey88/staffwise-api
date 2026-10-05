import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { offices } from '../database/schema/office.schema.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';

@Injectable()
export class OfficeRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(offices).orderBy(asc(offices.name));
  }

  async findById(id: number) {
    return this.db.query.offices.findFirst({ where: eq(offices.id, id) });
  }

  /** undefined when the name is taken. */
  async create(data: typeof offices.$inferInsert) {
    try {
      const [row] = await this.db.insert(offices).values(data).returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  /** null when the new name is taken. */
  async update(id: number, data: Partial<typeof offices.$inferInsert>) {
    try {
      const [row] = await this.db
        .update(offices)
        .set(data)
        .where(eq(offices.id, id))
        .returning();
      return row;
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return null;
      throw err;
    }
  }
}
