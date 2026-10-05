import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { employeeDocuments } from '../database/schema/employee-document.schema.js';

export type DocumentCategory =
  (typeof employeeDocuments.category.enumValues)[number];

@Injectable()
export class DocumentRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: typeof employeeDocuments.$inferInsert) {
    const [row] = await this.db
      .insert(employeeDocuments)
      .values(data)
      .returning();
    return row;
  }

  async findById(id: number) {
    return this.db.query.employeeDocuments.findFirst({
      where: eq(employeeDocuments.id, id),
    });
  }

  async findByEmployee(employeeId: number, category?: DocumentCategory) {
    return this.db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.employeeId, employeeId),
          category ? eq(employeeDocuments.category, category) : undefined,
        ),
      )
      .orderBy(desc(employeeDocuments.id));
  }

  async remove(id: number) {
    await this.db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
  }
}
