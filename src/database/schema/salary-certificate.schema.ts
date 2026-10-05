import { sql } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const salaryCertificateStatusEnum = pgEnum('salary_certificate_status', [
  'requested',
  'issued',
  'rejected',
  'cancelled',
]);

/** Numbers issued certificates (SC-<year>-NNNN). */
export const salaryCertificateRefSeq = pgSequence('salary_certificate_ref_seq');

/** What the certificate states, frozen at issue so re-downloads match. */
export interface SalaryCertificateSnapshot {
  employeeName: string;
  employeeCode: string;
  jobTitle: string;
  departmentName: string;
  employmentType: string;
  hiredAt: string;
  currency: string;
  basePay: string;
  allowances: string;
  grossPay: string;
  companyLegalName: string;
  signatoryName: string | null;
  signatoryTitle: string | null;
  /** YYYY-MM-DD in the attendance timezone. */
  issueDate: string;
}

export const salaryCertificates = pgTable(
  'salary_certificates',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    /** e.g. "Bank loan application", "Visa application". */
    purpose: varchar('purpose', { length: 200 }).notNull(),
    /** Recipient line; null prints "To Whom It May Concern". */
    addressedTo: varchar('addressed_to', { length: 200 }),
    status: salaryCertificateStatusEnum('status')
      .default('requested')
      .notNull(),
    referenceNo: varchar('reference_no', { length: 30 }).unique(),
    snapshot: jsonb('snapshot').$type<SalaryCertificateSnapshot>(),
    /** null when HR issued it directly, without a request. */
    requestedBy: integer('requested_by').references(() => users.id),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (t) => [
    // One open request per employee.
    uniqueIndex('salary_certificates_open_request_uq')
      .on(t.employeeId)
      .where(sql`${t.status} = 'requested'`),
  ],
);

export type SalaryCertificate = typeof salaryCertificates.$inferSelect;
