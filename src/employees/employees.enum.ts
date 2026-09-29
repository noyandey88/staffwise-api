// employees.enum.ts — also drives the employee_status pg enum (employees.schema.ts)
export enum EmployeeStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Terminated = 'terminated',
  Retired = 'retired',
  Resigned = 'resigned',
}

/** Former staff: their user account can no longer sign in. */
export const SIGN_IN_BLOCKED_STATUSES: readonly EmployeeStatus[] = [
  EmployeeStatus.Terminated,
  EmployeeStatus.Resigned,
  EmployeeStatus.Retired,
];
