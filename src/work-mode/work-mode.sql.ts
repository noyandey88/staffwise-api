import { sql, type SQL } from 'drizzle-orm';
import { workArrangements } from '../database/schema/work-arrangement.schema.js';

/**
 * LEFT JOIN LATERAL yielding `arr.mode`, `arr.office_days`,
 * `arr.office_days_per_week` for employee `e` on `day` — the SQL twin of
 * resolveArrangement(): most specific scope first, then latest
 * effective_from. No row means the default (onsite); coalesce arr.mode.
 */
export function arrangementLateral(employee: SQL, day: SQL) {
  return sql`LEFT JOIN LATERAL (
    SELECT wa.mode, wa.office_days, wa.office_days_per_week
    FROM ${workArrangements} wa
    WHERE wa.effective_from <= ${day}
      AND (
        (wa.scope = 'employee' AND wa.employee_id = ${employee}.id)
        OR (wa.scope = 'department' AND wa.department_id = ${employee}.department_id)
        OR wa.scope = 'company'
      )
    ORDER BY CASE wa.scope WHEN 'employee' THEN 0 WHEN 'department' THEN 1 ELSE 2 END,
      wa.effective_from DESC
    LIMIT 1
  ) arr ON true`;
}
