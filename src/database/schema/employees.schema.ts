import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { departments } from './departments.schema.js';

export const employeesEnum = pgEnum('employee_status', [
  'active',
  'on_leave',
  'terminated',
  'retired',
  'resigned',
]);

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  departmentId: integer('department_id')
    .references(() => departments.id)
    .notNull(),
  managerId: integer('manager_id').references((): any => employees.id),
  jobTitle: varchar('job_title', { length: 100 }).notNull(),
  status: employeesEnum('status').default('active').notNull(),
  hiredAt: date('hired_at').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});
