import { index, integer, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const documentCategoryEnum = pgEnum('document_category', [
  'contract',
  'id_proof',
  'certificate',
  'photo',
  'other',
]);

/** Files kept on an employee's record; the bytes live in StorageService. */
export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    category: documentCategoryEnum('category').notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    /** Storage key (server-generated). */
    fileKey: varchar('file_key', { length: 255 }).notNull().unique(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    /** Detected from the bytes, not the client's claim. */
    contentType: varchar('content_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: integer('uploaded_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [index('employee_documents_employee_idx').on(t.employeeId)],
);

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
