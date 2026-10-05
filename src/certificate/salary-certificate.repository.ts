import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq, lte, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type SalaryCertificateSnapshot,
  salaryCertificates,
} from '../database/schema/salary-certificate.schema.js';
import { salaryStructures } from '../database/schema/payroll.schema.js';
import {
  isPgError,
  PG_UNIQUE_VIOLATION,
} from '../common/utils/pg-error.util.js';
import type { PageWindow } from '../common/utils/pagination.util.js';
import type { SalaryCertificateStatus } from './dto/salary-certificate.dto.js';

/** SC-<issue year>-NNNN, from a sequence so numbers never repeat. */
const nextReference = (issueDate: string) =>
  sql`'SC-' || ${issueDate.slice(0, 4)} || '-' || lpad(nextval('salary_certificate_ref_seq')::text, 4, '0')`;

@Injectable()
export class SalaryCertificateRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** undefined when the employee already has an open request. */
  async createRequest(data: {
    employeeId: number;
    purpose: string;
    addressedTo: string | null;
    requestedBy: number;
  }) {
    try {
      const [row] = await this.db
        .insert(salaryCertificates)
        .values(data)
        .returning();
      return row;
    } catch (err: unknown) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) return undefined;
      throw err;
    }
  }

  /** HR issuing without a request. */
  async createIssued(data: {
    employeeId: number;
    purpose: string;
    addressedTo: string | null;
    reviewedBy: number;
    snapshot: SalaryCertificateSnapshot;
  }) {
    const [row] = await this.db
      .insert(salaryCertificates)
      .values({
        ...data,
        status: 'issued',
        reviewedAt: new Date(),
        referenceNo: nextReference(data.snapshot.issueDate),
      })
      .returning();
    return row;
  }

  /** Issues a still-open request; undefined if it is no longer open. */
  async issueRequest(
    id: number,
    reviewedBy: number,
    snapshot: SalaryCertificateSnapshot,
  ) {
    const [row] = await this.db
      .update(salaryCertificates)
      .set({
        status: 'issued',
        snapshot,
        reviewedBy,
        reviewedAt: new Date(),
        referenceNo: nextReference(snapshot.issueDate),
      })
      .where(
        and(
          eq(salaryCertificates.id, id),
          eq(salaryCertificates.status, 'requested'),
        ),
      )
      .returning();
    return row;
  }

  async reject(id: number, reviewedBy: number) {
    const [row] = await this.db
      .update(salaryCertificates)
      .set({ status: 'rejected', reviewedBy, reviewedAt: new Date() })
      .where(
        and(
          eq(salaryCertificates.id, id),
          eq(salaryCertificates.status, 'requested'),
        ),
      )
      .returning();
    return row;
  }

  async cancel(id: number, employeeId: number) {
    const [row] = await this.db
      .update(salaryCertificates)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(salaryCertificates.id, id),
          eq(salaryCertificates.employeeId, employeeId),
          eq(salaryCertificates.status, 'requested'),
        ),
      )
      .returning();
    return row;
  }

  async findById(id: number) {
    return this.db.query.salaryCertificates.findFirst({
      where: eq(salaryCertificates.id, id),
    });
  }

  async findByEmployee(employeeId: number) {
    return this.db
      .select()
      .from(salaryCertificates)
      .where(eq(salaryCertificates.employeeId, employeeId))
      .orderBy(desc(salaryCertificates.id));
  }

  async findPage(
    filter: { status?: SalaryCertificateStatus; employeeId?: number },
    window: PageWindow,
  ) {
    const conditions: SQL[] = [];
    if (filter.status) {
      conditions.push(eq(salaryCertificates.status, filter.status));
    }
    if (filter.employeeId !== undefined) {
      conditions.push(eq(salaryCertificates.employeeId, filter.employeeId));
    }
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(salaryCertificates)
        .where(where)
        .orderBy(desc(salaryCertificates.id))
        .limit(window.limit)
        .offset(window.offset),
      this.db.select({ total: count() }).from(salaryCertificates).where(where),
    ]);
    return { items, total };
  }

  /** Salary in effect on `date` (latest effective_from on or before it). */
  async salaryOn(employeeId: number, date: string) {
    const [row] = await this.db
      .select()
      .from(salaryStructures)
      .where(
        and(
          eq(salaryStructures.employeeId, employeeId),
          lte(salaryStructures.effectiveFrom, date),
        ),
      )
      .orderBy(desc(salaryStructures.effectiveFrom))
      .limit(1);
    return row;
  }
}
