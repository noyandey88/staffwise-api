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
import { arrangementLateral } from '../work-mode/work-mode.sql.js';
import { remoteWorkRequests } from '../database/schema/remote-work.schema.js';

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
      inOffice: number;
      remote: number;
      late: number;
      onLeave: number;
      notCheckedIn: number;
      offToday: number;
    }>(sql`
      WITH s AS (
        SELECT ${dayStatusSql(today)} AS status, a.work_location AS loc
        FROM ${employees} e
        CROSS JOIN LATERAL (SELECT ${today}::date AS day) d
        LEFT JOIN ${attendanceRecords} a ON a.employee_id = e.id AND a.work_date = day
        LEFT JOIN ${holidays} h ON h.date = day
        WHERE e.status NOT IN (${formerStaff()}) AND ${scope(sql`e.id`, employeeIds)}
      )
      SELECT
        count(*) FILTER (WHERE status IN ('present', 'late'))::int AS present,
        count(*) FILTER (WHERE status IN ('present', 'late') AND coalesce(loc, 'office') = 'office')::int AS "inOffice",
        count(*) FILTER (WHERE status IN ('present', 'late') AND loc = 'remote')::int AS remote,
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

  /**
   * Per current employee for [start, end) up to `today`: where they worked
   * and how they met their arrangement. Only days that have passed and
   * were working days for them count as required (holidays, weekends,
   * leave and approved remote work excuse a day). Fixed arrangements
   * (onsite, hybrid office days) require every such day; quota hybrids
   * require min(quota, available days) per week (Monday-start, so partial
   * weeks at month edges count fairly).
   */
  async workModes(
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
      mode: string;
      officeDays: number;
      remoteDays: number;
      outsideArrangementDays: number;
      requiredOfficeDays: number;
      metOfficeDays: number;
      compliancePercent: number | null;
    }>(sql`
      WITH d AS (
        SELECT e.id AS employee_id, day,
          coalesce(arr.mode::text, 'onsite') AS mode,
          arr.office_days, arr.office_days_per_week,
          ${dayStatusSql(today)} AS status,
          coalesce(a.work_location::text, 'office') AS loc,
          coalesce(a.outside_arrangement, false) AS outside,
          EXISTS (
            SELECT 1 FROM ${remoteWorkRequests} rw
            WHERE rw.employee_id = e.id AND rw.status = 'approved'
              AND day BETWEEN rw.start_date AND rw.end_date
          ) AS wfh
        FROM ${employees} e
        CROSS JOIN LATERAL (
          SELECT g::date AS day
          FROM generate_series(${start}::date, least(${end}::date, ${today}::date + 1) - 1, interval '1 day') g
        ) days
        LEFT JOIN ${attendanceRecords} a ON a.employee_id = e.id AND a.work_date = day
        LEFT JOIN ${holidays} h ON h.date = day
        ${arrangementLateral(sql`e`, sql`day`)}
        WHERE e.status NOT IN (${formerStaff()}) AND ${scope(sql`e.id`, employeeIds)}
      ),
      f AS (
        SELECT *,
          status IN ('present', 'late') AS worked,
          status IN ('present', 'late') AND loc = 'office' AS at_office,
          status IN ('present', 'late', 'absent') AND NOT wfh AS required_day,
          office_days_per_week IS NOT NULL AS quota
        FROM d
      ),
      fixed AS (
        SELECT employee_id,
          count(*) FILTER (WHERE required_day AND (mode = 'onsite'
            OR (mode = 'hybrid' AND extract(dow FROM day)::int = ANY(office_days))))::int AS required,
          count(*) FILTER (WHERE required_day AND at_office AND (mode = 'onsite'
            OR (mode = 'hybrid' AND extract(dow FROM day)::int = ANY(office_days))))::int AS met
        FROM f WHERE NOT quota GROUP BY employee_id
      ),
      weeks AS (
        SELECT employee_id, date_trunc('week', day) AS week,
          least(max(office_days_per_week), count(*) FILTER (WHERE required_day)) AS required,
          count(*) FILTER (WHERE at_office) AS office
        FROM f WHERE quota GROUP BY employee_id, week
      ),
      quota AS (
        SELECT employee_id, sum(required)::int AS required,
          sum(least(office, required))::int AS met
        FROM weeks GROUP BY employee_id
      ),
      latest AS (
        SELECT DISTINCT ON (employee_id) employee_id,
          CASE WHEN mode = 'hybrid' AND quota
            THEN 'hybrid (' || office_days_per_week || '/week)'
            WHEN mode = 'hybrid' THEN 'hybrid (fixed days)'
            ELSE mode END AS mode
        FROM f ORDER BY employee_id, day DESC
      ),
      totals AS (
        SELECT employee_id,
          count(*) FILTER (WHERE at_office)::int AS office_days,
          count(*) FILTER (WHERE worked AND loc = 'remote')::int AS remote_days,
          count(*) FILTER (WHERE outside)::int AS outside_days
        FROM f GROUP BY employee_id
      )
      SELECT e.id AS "employeeId", e.employee_code AS "employeeCode",
        u.first_name || ' ' || u.last_name AS name, dp.name AS "departmentName",
        l.mode,
        t.office_days AS "officeDays", t.remote_days AS "remoteDays",
        t.outside_days AS "outsideArrangementDays",
        (coalesce(fx.required, 0) + coalesce(qt.required, 0)) AS "requiredOfficeDays",
        (coalesce(fx.met, 0) + coalesce(qt.met, 0)) AS "metOfficeDays",
        CASE WHEN coalesce(fx.required, 0) + coalesce(qt.required, 0) = 0 THEN NULL
          ELSE round(100.0 * (coalesce(fx.met, 0) + coalesce(qt.met, 0))
            / (coalesce(fx.required, 0) + coalesce(qt.required, 0)))::int END AS "compliancePercent"
      FROM totals t
      JOIN latest l ON l.employee_id = t.employee_id
      JOIN ${employees} e ON e.id = t.employee_id
      JOIN ${users} u ON u.id = e.user_id
      JOIN ${departments} dp ON dp.id = e.department_id
      LEFT JOIN fixed fx ON fx.employee_id = t.employee_id
      LEFT JOIN quota qt ON qt.employee_id = t.employee_id
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
