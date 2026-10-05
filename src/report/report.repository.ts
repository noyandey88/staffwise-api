import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { employees } from '../database/schema/employees.schema.js';
import { users } from '../database/schema/user.schema.js';
import { departments } from '../database/schema/departments.schema.js';
import { attendanceRecords } from '../database/schema/attendance.schema.js';
import { attendanceCorrections } from '../database/schema/attendance.schema.js';
import { holidays } from '../database/schema/holiday.schema.js';
import {
  leaveBalances,
  leaveRequests,
  leaveTypes,
} from '../database/schema/leave.schema.js';
import { payrollRuns, payslips } from '../database/schema/payroll.schema.js';
import { salaryCertificates } from '../database/schema/salary-certificate.schema.js';
import { separations } from '../database/schema/separation.schema.js';
import { dayStatusSql } from '../attendance/attendance.repository.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';

/** SQL list of the statuses that mean "has left". */
const formerStaff = () =>
  sql.join(
    SIGN_IN_BLOCKED_STATUSES.map((s) => sql`${s}`),
    sql`, `,
  );

/** `employeeIds` undefined = everyone; [] matches nobody. */
const scope = (column: unknown, employeeIds?: number[]) =>
  employeeIds === undefined
    ? sql`TRUE`
    : employeeIds.length
      ? sql`${column} IN (${sql.join(
          employeeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql`FALSE`;

type Row = Record<string, unknown>;

/** Read-only aggregates for dashboards and reports (raw SQL, aliased). */
@Injectable()
export class ReportRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private async rows<T extends Row>(query: ReturnType<typeof sql>) {
    return (await this.db.execute<T>(query)).rows;
  }

  async headcountByDepartment() {
    return this.rows<{
      departmentId: number;
      departmentName: string;
      headcount: number;
      permanent: number;
      contract: number;
      intern: number;
      partTime: number;
    }>(sql`
      SELECT d.id AS "departmentId", d.name AS "departmentName",
        count(e.id)::int AS headcount,
        count(e.id) FILTER (WHERE e.employment_type = 'permanent')::int AS permanent,
        count(e.id) FILTER (WHERE e.employment_type = 'contract')::int AS contract,
        count(e.id) FILTER (WHERE e.employment_type = 'intern')::int AS intern,
        count(e.id) FILTER (WHERE e.employment_type = 'part_time')::int AS "partTime"
      FROM ${departments} d
      LEFT JOIN ${employees} e
        ON e.department_id = d.id AND e.status NOT IN (${formerStaff()})
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
  }

  /** Joiners (hired) and leavers (separation completing) in [start, end). */
  async movements(start: string, end: string) {
    const [row] = await this.rows<{ joiners: number; leavers: number }>(sql`
      SELECT
        (SELECT count(*) FROM ${employees}
          WHERE hired_at >= ${start}::date AND hired_at < ${end}::date)::int AS joiners,
        (SELECT count(*) FROM ${separations}
          WHERE status IN ('approved', 'completed')
            AND last_working_day >= ${start}::date
            AND last_working_day < ${end}::date)::int AS leavers
    `);
    return row;
  }

  /** Today's status counts for current staff (optionally a subset). */
  async today(today: string, employeeIds?: number[]) {
    const [row] = await this.rows<{
      present: number;
      late: number;
      onLeave: number;
      notCheckedIn: number;
      offToday: number;
    }>(sql`
      WITH s AS (
        SELECT ${dayStatusSql(today)} AS status
        FROM ${employees} e
        CROSS JOIN LATERAL (SELECT ${today}::date AS day) d
        LEFT JOIN ${attendanceRecords} a ON a.employee_id = e.id AND a.work_date = day
        LEFT JOIN ${holidays} h ON h.date = day
        WHERE e.status NOT IN (${formerStaff()}) AND ${scope(sql`e.id`, employeeIds)}
      )
      SELECT
        count(*) FILTER (WHERE status IN ('present', 'late'))::int AS present,
        count(*) FILTER (WHERE status = 'late')::int AS late,
        count(*) FILTER (WHERE status = 'leave')::int AS "onLeave",
        count(*) FILTER (WHERE status = 'upcoming')::int AS "notCheckedIn",
        count(*) FILTER (WHERE status IN ('holiday', 'weekend'))::int AS "offToday"
      FROM s
    `);
    return row;
  }

  async pending(employeeIds?: number[]) {
    const [row] = await this.rows<{
      leaveRequests: number;
      attendanceCorrections: number;
      salaryCertificates: number;
      resignations: number;
    }>(sql`
      SELECT
        (SELECT count(*) FROM ${leaveRequests}
          WHERE status = 'pending' AND ${scope(sql`employee_id`, employeeIds)})::int AS "leaveRequests",
        (SELECT count(*) FROM ${attendanceCorrections}
          WHERE status = 'pending' AND ${scope(sql`employee_id`, employeeIds)})::int AS "attendanceCorrections",
        (SELECT count(*) FROM ${salaryCertificates}
          WHERE status = 'requested' AND ${scope(sql`employee_id`, employeeIds)})::int AS "salaryCertificates",
        (SELECT count(*) FROM ${separations}
          WHERE status = 'requested' AND ${scope(sql`employee_id`, employeeIds)})::int AS resignations
    `);
    return row;
  }

  async latestPayrollRun() {
    const [row] = await this.rows<{
      id: number;
      month: string;
      status: string;
      payslipCount: number;
      totalNet: string;
    }>(sql`
      SELECT r.id, to_char(r.month, 'YYYY-MM') AS month, r.status,
        count(p.id)::int AS "payslipCount",
        coalesce(sum(p.net_pay), 0)::numeric(14,2)::text AS "totalNet"
      FROM ${payrollRuns} r LEFT JOIN ${payslips} p ON p.payroll_run_id = r.id
      GROUP BY r.id ORDER BY r.month DESC LIMIT 1
    `);
    return row ?? null;
  }

  /**
   * Per current employee, day counts for [start, end) using the same
   * classification as the day-by-day view. `workingDays` counts the
   * days that were expected at work so far (present + late + absent).
   */
  async attendance(
    start: string,
    end: string,
    today: string,
    employeeIds?: number[],
  ) {
    return this.rows<{
      employeeId: number;
      employeeCode: string;
      name: string;
      departmentName: string;
      present: number;
      late: number;
      absent: number;
      leave: number;
      holidays: number;
      workedMinutes: number;
    }>(sql`
      WITH s AS (
        SELECT e.id AS employee_id,
          ${dayStatusSql(today)} AS status,
          floor(extract(epoch FROM (a.check_out_at - a.check_in_at)) / 60) AS worked
        FROM ${employees} e
        CROSS JOIN LATERAL (
          SELECT g::date AS day
          FROM generate_series(${start}::date, ${end}::date - 1, interval '1 day') g
        ) d
        LEFT JOIN ${attendanceRecords} a ON a.employee_id = e.id AND a.work_date = day
        LEFT JOIN ${holidays} h ON h.date = day
        WHERE e.status NOT IN (${formerStaff()}) AND ${scope(sql`e.id`, employeeIds)}
      )
      SELECT e.id AS "employeeId", e.employee_code AS "employeeCode",
        u.first_name || ' ' || u.last_name AS name, dp.name AS "departmentName",
        count(*) FILTER (WHERE s.status IN ('present', 'late'))::int AS present,
        count(*) FILTER (WHERE s.status = 'late')::int AS late,
        count(*) FILTER (WHERE s.status = 'absent')::int AS absent,
        count(*) FILTER (WHERE s.status = 'leave')::int AS leave,
        count(*) FILTER (WHERE s.status = 'holiday')::int AS holidays,
        coalesce(sum(s.worked), 0)::int AS "workedMinutes"
      FROM s
      JOIN ${employees} e ON e.id = s.employee_id
      JOIN ${users} u ON u.id = e.user_id
      JOIN ${departments} dp ON dp.id = e.department_id
      GROUP BY e.id, e.employee_code, u.first_name, u.last_name, dp.name
      ORDER BY dp.name, name
    `);
  }

  /** Per current employee and paid type: days taken (approved) and left. */
  async leave(year: number) {
    return this.rows<{
      employeeId: number;
      employeeCode: string;
      name: string;
      departmentName: string;
      leaveType: string;
      isPaid: boolean;
      daysTaken: number;
      remainingDays: number | null;
    }>(sql`
      SELECT e.id AS "employeeId", e.employee_code AS "employeeCode",
        u.first_name || ' ' || u.last_name AS name, dp.name AS "departmentName",
        lt.name AS "leaveType", lt.is_paid AS "isPaid",
        coalesce((
          SELECT sum(lr.days) FROM ${leaveRequests} lr
          WHERE lr.employee_id = e.id AND lr.leave_type_id = lt.id
            AND lr.status = 'approved'
            AND lr.start_date >= ${`${year}-01-01`}::date
            AND lr.start_date < ${`${year + 1}-01-01`}::date
        ), 0)::int AS "daysTaken",
        lb.remaining_days AS "remainingDays"
      FROM ${employees} e
      JOIN ${users} u ON u.id = e.user_id
      JOIN ${departments} dp ON dp.id = e.department_id
      CROSS JOIN ${leaveTypes} lt
      LEFT JOIN ${leaveBalances} lb
        ON lb.employee_id = e.id AND lb.leave_type_id = lt.id AND lb.year = ${year}
      WHERE e.status NOT IN (${formerStaff()})
      ORDER BY dp.name, name, lt.name
    `);
  }

  /** Approved/paid runs per month of the year. */
  async payroll(year: number) {
    return this.rows<{
      month: string;
      status: string;
      employees: number;
      totalGross: string;
      totalDeductions: string;
      totalNet: string;
    }>(sql`
      SELECT to_char(r.month, 'YYYY-MM') AS month, r.status,
        count(p.id)::int AS employees,
        coalesce(sum(p.gross_pay), 0)::numeric(14,2)::text AS "totalGross",
        coalesce(sum(p.deductions), 0)::numeric(14,2)::text AS "totalDeductions",
        coalesce(sum(p.net_pay), 0)::numeric(14,2)::text AS "totalNet"
      FROM ${payrollRuns} r JOIN ${payslips} p ON p.payroll_run_id = r.id
      WHERE r.status IN ('approved', 'paid')
        AND r.month >= ${`${year}-01-01`}::date AND r.month < ${`${year + 1}-01-01`}::date
      GROUP BY r.id ORDER BY r.month
    `);
  }
}
