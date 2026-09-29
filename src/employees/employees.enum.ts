// employees.enum.ts — also drives the employee_status pg enum (employees.schema.ts)
export enum EmployeeStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Terminated = 'terminated',
  Retired = 'retired',
  Resigned = 'resigned',
}
