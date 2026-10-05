import { sql, type SQL } from 'drizzle-orm';
import { employeeDepartments } from '../database/schema/employee-department.schema.js';

/**
 * SQL int: the department `employee` (an employees row alias) belonged to
 * on `day` — latest history row on or before it, else the current one
 * (days before the first row, e.g. before hire).
 */
export function departmentOnSql(employee: SQL, day: SQL) {
  return sql`coalesce(
    (SELECT ed.department_id FROM ${employeeDepartments} ed
      WHERE ed.employee_id = ${employee}.id AND ed.effective_from <= ${day}::date
      ORDER BY ed.effective_from DESC LIMIT 1),
    ${employee}.department_id)`;
}
