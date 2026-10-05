import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { attendancePolicies } from '../database/schema/attendance-policy.schema.js';

@Injectable()
export class AttendancePolicyRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** Newest first. */
  async findAll() {
    return this.db
      .select()
      .from(attendancePolicies)
      .orderBy(desc(attendancePolicies.effectiveFrom));
  }

  async findById(id: number) {
    return this.db.query.attendancePolicies.findFirst({
      where: eq(attendancePolicies.id, id),
    });
  }

  /** undefined when one already starts on that date. */
  async create(data: typeof attendancePolicies.$inferInsert) {
    const [row] = await this.db
      .insert(attendancePolicies)
      .values(data)
      .onConflictDoNothing({ target: attendancePolicies.effectiveFrom })
      .returning();
    return row;
  }

  async remove(id: number) {
    await this.db
      .delete(attendancePolicies)
      .where(eq(attendancePolicies.id, id));
  }

  /** Postgres must know the zone too: it converts check-in times. */
  async isKnownTimezone(name: string) {
    const result = await this.db.execute<{ known: boolean }>(
      sql`SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = ${name}) AS known`,
    );
    return result.rows[0].known;
  }
}
