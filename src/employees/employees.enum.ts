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

export enum EmploymentType {
  Permanent = 'permanent',
  Contract = 'contract',
  Intern = 'intern',
  PartTime = 'part_time',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export enum BloodGroup {
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  AbPositive = 'AB+',
  AbNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}
