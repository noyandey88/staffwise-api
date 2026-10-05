import { sql, type SQL } from 'drizzle-orm';
import { attendancePolicies } from '../database/schema/attendance-policy.schema.js';
import { DEFAULT_ATTENDANCE_POLICY as D } from '../attendance/attendance.constants.js';

/** The attendance policy row in force on `workDate` (subquery source). */
const policyOn = (workDate: SQL) =>
  sql`FROM ${attendancePolicies} p
      WHERE p.effective_from <= ${workDate}::date
      ORDER BY p.effective_from DESC LIMIT 1`;

/**
 * SQL boolean: the check-in was after work start + grace, in the timezone
 * and rules of the policy in force on that work date.
 */
export function isLateSql(checkIn: SQL, workDate: SQL) {
  return sql`coalesce(
    (SELECT (${checkIn} AT TIME ZONE p.timezone)::time
        > p.work_start_time + make_interval(mins => p.late_grace_minutes)
      ${policyOn(workDate)}),
    (${checkIn} AT TIME ZONE ${D.timezone}::text)::time
        > ${D.workStartTime}::time + make_interval(mins => ${D.lateGraceMinutes}))`;
}

/** SQL int: standard minutes for that work date (beyond = overtime). */
export function standardMinutesSql(workDate: SQL) {
  return sql`coalesce(
    (SELECT p.standard_work_minutes ${policyOn(workDate)}),
    ${D.standardWorkMinutes})`;
}
