import { sql } from 'drizzle-orm';
import { char, check, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';

/**
 * Single-row table (id is pinned to 1): the company this deployment
 * serves, including the white-label branding clients render.
 */
export const companyProfile = pgTable(
  'company_profile',
  {
    id: integer().primaryKey().default(1),
    legalName: varchar('legal_name', { length: 150 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    logoUrl: varchar('logo_url', { length: 500 }),
    faviconUrl: varchar('favicon_url', { length: 500 }),
    primaryColor: varchar('primary_color', { length: 7 }),
    accentColor: varchar('accent_color', { length: 7 }),
    supportEmail: varchar('support_email', { length: 255 }),
    phone: varchar('phone', { length: 30 }),
    website: varchar('website', { length: 255 }),
    address: varchar('address', { length: 255 }),
    taxId: varchar('tax_id', { length: 50 }),
    /** Signs issued documents (salary certificates). */
    signatoryName: varchar('signatory_name', { length: 100 }),
    signatoryTitle: varchar('signatory_title', { length: 100 }),
    currency: char('currency', { length: 3 }).default('BDT').notNull(),
    /** Days of week off (0 = Sunday … 6 = Saturday, as Postgres `dow`). */
    weekendDays: integer('weekend_days')
      .array()
      .default(sql`'{5,6}'`)
      .notNull(),
    ...timestamps,
  },
  (t) => [check('company_profile_singleton', sql`${t.id} = 1`)],
);

export type CompanyProfile = typeof companyProfile.$inferSelect;
export type NewCompanyProfile = typeof companyProfile.$inferInsert;
