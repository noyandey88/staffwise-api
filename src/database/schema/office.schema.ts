import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';

/**
 * A workplace used to verify office check-ins: by network (CIDR ranges)
 * and/or by location (a radius around a point). Deactivate rather than
 * delete: attendance records keep pointing at it.
 */
export const offices = pgTable('offices', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  radiusMeters: integer('radius_meters'),
  /** CIDR blocks, e.g. 203.0.113.0/24 or 2001:db8::/48. */
  ipRanges: text('ip_ranges').array().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

export type Office = typeof offices.$inferSelect;
