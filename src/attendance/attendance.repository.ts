import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import { attendanceRecords } from '../database/schema/attendance.schema.js';
import { and, eq, getTableColumns, gte, isNull, lt, sql } from 'drizzle-orm';
import {
  ATTENDANCE_TIMEZONE,
  LATE_AFTER,
  STANDARD_WORK_MINUTES,
} from './attendance.constants.js';

@Injectable()
export class AttendanceRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async checkIn(employeeId: number, workDate: string) {
    const [row] = await this.db
      .insert(attendanceRecords)
      .values({ employeeId, workDate, checkInAt: new Date() })
      .onConflictDoNothing()
      .returning();

    return row;
  }

  async checkOut(employeeId: number, workDate: string) {
    const [row] = await this.db
      .update(attendanceRecords)
      .set({ checkOutAt: new Date() })
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.workDate, workDate),
          isNull(attendanceRecords.checkOutAt),
        ),
      )
      .returning();

    return row;
  }

  async findByEmployeeAndMonth(employeeId: number, start: string, end: string) {
    const workedMinutes = sql<
      number | null
    >`floor(extract(epoch from (${attendanceRecords.checkOutAt} - ${attendanceRecords.checkInAt})) / 60)::int`;

    const isLate = sql<boolean>`((${attendanceRecords.checkInAt} at time zone ${ATTENDANCE_TIMEZONE}::text)::time > ${LATE_AFTER}::time)`;

    const overtimeMinutes = sql<
      number | null
    >`greatest(${workedMinutes} - ${STANDARD_WORK_MINUTES}::int, 0)`;

    return await this.db
      .select({
        ...getTableColumns(attendanceRecords),
        workedMinutes,
        isLate,
        overtimeMinutes,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.workDate, start),
          lt(attendanceRecords.workDate, end),
        ),
      )
      .orderBy(attendanceRecords.workDate);
  }

  /** Monthly totals per employee, ranked by minutes worked (window function). */
  async monthlySummary(start: string, end: string) {
    const result = await this.db.execute(sql`
        WITH daily AS (
          SELECT
            a.employee_id,
            (a.check_in_at AT TIME ZONE ${ATTENDANCE_TIMEZONE}::text)::time > ${LATE_AFTER}::time AS is_late,
            floor(extract(epoch FROM (a.check_out_at - a.check_in_at)) / 60) AS worked
          FROM attendance_records a
          WHERE a.work_date >= ${start}::date AND a.work_date < ${end}::date
        ),
        totals AS (
          SELECT
            employee_id,
            COUNT(*) AS days_present,
            COUNT(*) FILTER (WHERE is_late) AS late_days,
            COALESCE(SUM(worked), 0) AS worked_minutes,
            COALESCE(SUM(GREATEST(worked - ${STANDARD_WORK_MINUTES}::int, 0)), 0) AS overtime_minutes
          FROM daily
          GROUP BY employee_id
        )
        SELECT
          t.employee_id::int AS "employeeId",
          u.first_name AS "firstName",
          u.last_name AS "lastName",
          t.days_present::int AS "daysPresent",
          t.late_days::int AS "lateDays",
          t.worked_minutes::int AS "workedMinutes",
          t.overtime_minutes::int AS "overtimeMinutes",
          RANK() OVER (ORDER BY t.worked_minutes DESC)::int AS "rank"
        FROM totals t
        JOIN employees e ON e.id = t.employee_id
        JOIN users u ON u.id = e.user_id
        ORDER BY "rank", "employeeId"
      `);
    return result.rows;
  }
}
