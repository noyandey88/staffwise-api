import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type SalaryStructure,
  salaryStructures,
} from '../database/schema/payroll.schema.js';

@Injectable()
export class SalaryStructureRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** Newest first. */
  async findByEmployee(employeeId: number): Promise<SalaryStructure[]> {
    return await this.db.query.salaryStructures.findMany({
      where: eq(salaryStructures.employeeId, employeeId),
      orderBy: desc(salaryStructures.effectiveFrom),
    });
  }

  async findByEffectiveDate(
    employeeId: number,
    effectiveFrom: string,
  ): Promise<SalaryStructure | undefined> {
    return await this.db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.employeeId, employeeId),
        eq(salaryStructures.effectiveFrom, effectiveFrom),
      ),
    });
  }

  async create(
    data: typeof salaryStructures.$inferInsert,
  ): Promise<SalaryStructure> {
    const [structure] = await this.db
      .insert(salaryStructures)
      .values(data)
      .returning();
    return structure;
  }
}
