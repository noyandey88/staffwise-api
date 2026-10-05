import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { workWeeks } from '../database/schema/work-week.schema.js';
import { DEFAULT_WEEKEND_DAYS } from './calendar.constants.js';
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

  async findWorkWeeks() {
    return this.db
      .select()
      .from(workWeeks)
      .orderBy(desc(workWeeks.effectiveFrom));
  }

  async findWorkWeekById(id: number) {
    return this.db.query.workWeeks.findFirst({ where: eq(workWeeks.id, id) });
  }

  /** undefined when one already starts on that date. */
  async createWorkWeek(data: typeof workWeeks.$inferInsert) {
    const [row] = await this.db
      .insert(workWeeks)
      .values(data)
      .onConflictDoNothing({ target: workWeeks.effectiveFrom })
      .returning();
    return row;
  }

  async removeWorkWeek(id: number) {
    await this.db.delete(workWeeks).where(eq(workWeeks.id, id));
  }

  /** Inclusive count of days in [start, end] that are neither weekend nor holiday. */
  async countWorkingDays(start: string, end: string): Promise<number> {
    const result = await this.db.execute<{ days: number }>(sql`
      SELECT count(*)::int AS days
      FROM generate_series(${start}::date, ${end}::date, interval '1 day') AS d
      WHERE ${notWeekend(sql`d`)}
        AND NOT EXISTS (
          SELECT 1 FROM ${holidays} h WHERE h.date = d::date
        )
    `);
    return result.rows[0].days;
  }
}

/**
 * SQL predicate: `day` is a working weekday under the work week in force
 * on that day (latest work_weeks.effective_from <= day; the default
 * weekend if none is set up).
 */
export function notWeekend(day: SQL) {
  const fallback = sql.join(
    DEFAULT_WEEKEND_DAYS.map((d) => sql`${d}`),
    sql`, `,
  );
  return sql`extract(dow from ${day})::int <> ALL(coalesce(
    (SELECT w.weekend_days FROM ${workWeeks} w
      WHERE w.effective_from <= ${day}::date
      ORDER BY w.effective_from DESC LIMIT 1),
    ARRAY[${fallback}]::int[]))`;
}
