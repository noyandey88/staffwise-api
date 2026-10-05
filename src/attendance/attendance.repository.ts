import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import {
  attendanceCorrections,
  attendanceRecords,
  type NewAttendanceCorrection,
} from '../database/schema/attendance.schema.js';
import { employees } from '../database/schema/employees.schema.js';
import { holidays } from '../database/schema/holiday.schema.js';
import { leaveRequests } from '../database/schema/leave.schema.js';
import {
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { notWeekend } from '../calendar/calendar.repository.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';
import type { AttendanceCorrectionStatus } from './dto/attendance-correction.dto.js';
import type { DayStatus } from './dto/attendance-response.dto.js';
import {
  ATTENDANCE_TIMEZONE,
  LATE_AFTER,
  STANDARD_WORK_MINUTES,
} from './attendance.constants.js';

export interface AttendanceDayRow {
  date: string;
  status: DayStatus;
  holidayName: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workedMinutes: number | null;
  [key: string]: unknown;
}

/** Validates the merged times before they are written; throws to abort. */
export type CorrectionGuard = (
  checkInAt: Date,
  checkOutAt: Date | null,
) => void;

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

  async findRecord(employeeId: number, workDate: string) {
    return this.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.workDate, workDate),
      ),
    });
  }

  /**
   * One row per day of [start, end) for the employee. Statuses are derived
   * at read time, like lateness: nothing about absence is stored.
   */
  async dailyStatus(
    employeeId: number,
    start: string,
    end: string,
    today: string,
    weekendDays: readonly number[],
  ): Promise<AttendanceDayRow[]> {
    const result = await this.db.execute<AttendanceDayRow>(sql`
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        CASE
          WHEN a.id IS NOT NULL THEN
            CASE
              WHEN (a.check_in_at AT TIME ZONE ${ATTENDANCE_TIMEZONE}::text)::time > ${LATE_AFTER}::time
                THEN 'late'
              ELSE 'present'
            END
          WHEN d.day < e.hired_at THEN 'not_employed'
          WHEN h.id IS NOT NULL THEN 'holiday'
          WHEN NOT (${notWeekend(sql`d.day`, weekendDays)}) THEN 'weekend'
          WHEN EXISTS (
            SELECT 1 FROM ${leaveRequests} lr
            WHERE lr.employee_id = e.id
              AND lr.status = 'approved'
              AND d.day BETWEEN lr.start_date AND lr.end_date
          ) THEN 'leave'
          WHEN d.day >= ${today}::date THEN 'upcoming'
          ELSE 'absent'
        END AS status,
        h.name AS "holidayName",
        a.check_in_at AS "checkInAt",
        a.check_out_at AS "checkOutAt",
        floor(extract(epoch FROM (a.check_out_at - a.check_in_at)) / 60)::int AS "workedMinutes"
      FROM generate_series(${start}::date, ${end}::date - 1, interval '1 day') AS g(ts)
      CROSS JOIN LATERAL (SELECT g.ts::date AS day) d
      JOIN ${employees} e ON e.id = ${employeeId}
      LEFT JOIN ${attendanceRecords} a
        ON a.employee_id = e.id AND a.work_date = d.day
      LEFT JOIN ${holidays} h ON h.date = d.day
      ORDER BY d.day
    `);
    return result.rows;
  }

  // --- corrections ---

  /** undefined when a pending request for that day already exists. */
  async createCorrection(data: NewAttendanceCorrection) {
    try {
      const [row] = await this.db
        .insert(attendanceCorrections)
        .values(data)
        .returning();
      return row;
    } catch (err: unknown) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  async findCorrectionById(id: number) {
    return this.db.query.attendanceCorrections.findFirst({
      where: eq(attendanceCorrections.id, id),
    });
  }

  async findCorrections(filter: {
    employeeIds?: number[];
    status?: AttendanceCorrectionStatus;
  }) {
    if (filter.employeeIds?.length === 0) return [];
    const conditions: SQL[] = [];
    if (filter.employeeIds) {
      conditions.push(
        inArray(attendanceCorrections.employeeId, filter.employeeIds),
      );
    }
    if (filter.status) {
      conditions.push(eq(attendanceCorrections.status, filter.status));
    }
    return this.db
      .select()
      .from(attendanceCorrections)
      .where(and(...conditions))
      .orderBy(
        desc(attendanceCorrections.workDate),
        desc(attendanceCorrections.id),
      );
  }

  /** Cancels the employee's own pending request; undefined if not possible. */
  async cancelCorrection(id: number, employeeId: number) {
    const [row] = await this.db
      .update(attendanceCorrections)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(attendanceCorrections.id, id),
          eq(attendanceCorrections.employeeId, employeeId),
          eq(attendanceCorrections.status, 'pending'),
        ),
      )
      .returning();
    return row;
  }

  async rejectCorrection(id: number, reviewerUserId: number) {
    const [row] = await this.db
      .update(attendanceCorrections)
      .set({
        status: 'rejected',
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceCorrections.id, id),
          eq(attendanceCorrections.status, 'pending'),
        ),
      )
      .returning();
    if (!row) {
      throw new ConflictException('Only pending corrections can be rejected');
    }
    return row;
  }

  /**
   * Applies the corrected times to the day's record (creating it if the
   * day had none) and marks the request approved, atomically. The merged
   * times are re-validated because the record may have changed since the
   * request was made.
   */
  async approveCorrection(
    id: number,
    reviewerUserId: number,
    guard: CorrectionGuard,
  ) {
    return this.db.transaction(async (tx) => {
      const [correction] = await tx
        .select()
        .from(attendanceCorrections)
        .where(eq(attendanceCorrections.id, id))
        .for('update');
      if (!correction) {
        throw new NotFoundException('Attendance correction not found');
      }
      if (correction.status !== 'pending') {
        throw new ConflictException('Only pending corrections can be approved');
      }

      const [record] = await tx
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, correction.employeeId),
            eq(attendanceRecords.workDate, correction.workDate),
          ),
        )
        .for('update');

      const checkInAt = correction.checkInAt ?? record?.checkInAt;
      if (!checkInAt) {
        throw new ConflictException(
          'The day has no attendance record, so a check-in time is required',
        );
      }
      const checkOutAt = correction.checkOutAt ?? record?.checkOutAt ?? null;
      guard(checkInAt, checkOutAt);

      if (record) {
        await tx
          .update(attendanceRecords)
          .set({ checkInAt, checkOutAt })
          .where(eq(attendanceRecords.id, record.id));
      } else {
        await tx.insert(attendanceRecords).values({
          employeeId: correction.employeeId,
          workDate: correction.workDate,
          checkInAt,
          checkOutAt,
        });
      }

      const [approved] = await tx
        .update(attendanceCorrections)
        .set({
          status: 'approved',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        })
        .where(eq(attendanceCorrections.id, id))
        .returning();
      return approved;
    });
  }
}
