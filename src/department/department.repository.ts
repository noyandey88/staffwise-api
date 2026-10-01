import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import {
  Department,
  departments,
  NewDepartment,
} from '../database/schema/departments.schema.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class DepartmentRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: NewDepartment): Promise<Department> {
    const [department] = await this.db
      .insert(departments)
      .values(data)
      .returning();

    return department;
  }

  async findAll(): Promise<Department[]> {
    return await this.db.select().from(departments);
  }

  async findById(id: number): Promise<Department | undefined> {
    return await this.db.query.departments.findFirst({
      where: eq(departments.id, id),
    });
  }

  async findByName(name: string): Promise<Department | undefined> {
    return await this.db.query.departments.findFirst({
      where: eq(departments.name, name),
    });
  }

  async update(
    id: number,
    data: Partial<NewDepartment>,
  ): Promise<Department | undefined> {
    const [department] = await this.db
      .update(departments)
      .set(data)
      .where(eq(departments.id, id))
      .returning();

    return department;
  }

  async remove(id: number): Promise<void> {
    await this.db.delete(departments).where(eq(departments.id, id));
  }
}
