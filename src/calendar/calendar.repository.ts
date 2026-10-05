import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type Holiday,
  holidays,
  type NewHoliday,
} from '../database/schema/holiday.schema.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';

@Injectable()
export class CalendarRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** undefined when a holiday already exists on that date. */
  async createHoliday(data: NewHoliday): Promise<Holiday | undefined> {
    const [holiday] = await this.db
      .insert(holidays)
      .values(data)
      .onConflictDoNothing({ target: holidays.date })
      .returning();
    return holiday;
  }

  async findHolidayById(id: number): Promise<Holiday | undefined> {
    return this.db.query.holidays.findFirst({ where: eq(holidays.id, id) });
  }

  /** Half-open range [start, end). */
  async findHolidays(start: string, end: string): Promise<Holiday[]> {
    return this.db
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, start), lt(holidays.date, end)))
      .orderBy(asc(holidays.date));
  }

  async updateHoliday(
    id: number,
    data: Partial<Omit<NewHoliday, 'id'>>,
  ): Promise<Holiday | undefined | null> {
    try {
      const [holiday] = await this.db
        .update(holidays)
        .set(data)
        .where(eq(holidays.id, id))
        .returning();
      return holiday;
    } catch (err: unknown) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) {
        return null; // date clash
      }
      throw err;
    }
  }

  async removeHoliday(id: number): Promise<void> {
    await this.db.delete(holidays).where(eq(holidays.id, id));
  }

  /** Inclusive count of days in [start, end] that are neither weekend nor holiday. */
  async countWorkingDays(
    start: string,
    end: string,
    weekendDays: readonly number[],
  ): Promise<number> {
    const result = await this.db.execute<{ days: number }>(sql`
      SELECT count(*)::int AS days
      FROM generate_series(${start}::date, ${end}::date, interval '1 day') AS d
      WHERE ${notWeekend(sql`d`, weekendDays)}
        AND NOT EXISTS (
          SELECT 1 FROM ${holidays} h WHERE h.date = d::date
        )
    `);
    return result.rows[0].days;
  }
}

/** SQL predicate: `day` is not one of the weekend days. */
export function notWeekend(
  day: ReturnType<typeof sql>,
  weekendDays: readonly number[],
) {
  const list = sql.join(
    weekendDays.map((d) => sql`${d}`),
    sql`, `,
  );
  return sql`extract(dow from ${day})::int <> ALL(ARRAY[${list}]::int[])`;
}
