import { sql } from 'drizzle-orm';
import {
  date,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { departments } from './departments.schema.js';
import {
  BloodGroup,
  EmployeeStatus,
  EmploymentType,
  Gender,
} from '../../employees/employees.enum.js';
import { timestamps } from './common.schema.js';

export const employeesEnum = pgEnum(
  'employee_status',
  Object.values(EmployeeStatus) as [EmployeeStatus, ...EmployeeStatus[]],
);

export const employmentTypeEnum = pgEnum(
  'employment_type',
  Object.values(EmploymentType) as [EmploymentType, ...EmploymentType[]],
);

export const genderEnum = pgEnum(
  'gender',
  Object.values(Gender) as [Gender, ...Gender[]],
);

export const bloodGroupEnum = pgEnum(
  'blood_group',
  Object.values(BloodGroup) as [BloodGroup, ...BloodGroup[]],
);

/** Feeds the default employee code (EMP-00001, EMP-00002, …). */
export const employeeCodeSeq = pgSequence('employee_code_seq');

export const employees = pgTable('employees', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  /** HR may set its own; otherwise generated from employee_code_seq. */
  employeeCode: varchar('employee_code', { length: 20 })
    .notNull()
    .unique()
    .default(sql`'EMP-' || lpad(nextval('employee_code_seq')::text, 5, '0')`),
  departmentId: integer('department_id')
    .references(() => departments.id)
    .notNull(),
  managerId: integer('manager_id').references((): any => employees.id),
  jobTitle: varchar('job_title', { length: 100 }).notNull(),
  status: employeesEnum('status').default(EmployeeStatus.Active).notNull(),
  employmentType: employmentTypeEnum('employment_type')
    .default(EmploymentType.Permanent)
    .notNull(),
  hiredAt: date('hired_at').notNull(),
  probationEndDate: date('probation_end_date'),
  contractEndDate: date('contract_end_date'),

  // Personal details: visible only through the profile endpoints.
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  bloodGroup: bloodGroupEnum('blood_group'),
  nationalId: varchar('national_id', { length: 30 }).unique(),
  phone: varchar('phone', { length: 30 }),
  presentAddress: varchar('present_address', { length: 255 }),
  permanentAddress: varchar('permanent_address', { length: 255 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 100 }),
  emergencyContactRelationship: varchar('emergency_contact_relationship', {
    length: 50,
  }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  ...timestamps,
});

export type NewEmployee = typeof employees.$inferInsert;
export type Employee = typeof employees.$inferSelect;
