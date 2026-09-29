import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import {
  departments,
  employees,
  users,
  type NewUser,
  type User,
} from '../database/schema/index.js';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { eq, getTableColumns } from 'drizzle-orm';
import { UserRole } from './user.types.js';

// Every column except the password hash, for listing users.
const { password: _password, ...publicColumns } = getTableColumns(users);

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findById(id: number): Promise<User | undefined> {
    return await this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async existsWithRole(role: UserRole): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role))
      .limit(1);
    return Boolean(row);
  }

  /** Inserts unless the email is taken (safe if two instances race); undefined when skipped. */
  async createIfEmailFree(userData: NewUser): Promise<User | undefined> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoNothing({ target: users.email })
      .returning();
    return user;
  }

  async findAll() {
    return await this.db.select(publicColumns).from(users).orderBy(users.id);
  }

  async updateRole(id: number, role: UserRole): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  /** The linked employee's status, or undefined if the user has no employee record. */
  async findEmploymentStatus(userId: number) {
    const [row] = await this.db
      .select({ status: employees.status })
      .from(employees)
      .where(eq(employees.userId, userId));
    return row?.status;
  }

  /** User (without password) plus their employee record and department, if any. */
  async findProfile(userId: number) {
    const [row] = await this.db
      .select({
        ...publicColumns,
        employee: {
          id: employees.id,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          managerId: employees.managerId,
          jobTitle: employees.jobTitle,
          status: employees.status,
          hiredAt: employees.hiredAt,
        },
      })
      .from(users)
      .leftJoin(employees, eq(employees.userId, users.id))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(eq(users.id, userId));
    if (!row) return undefined;

    // drizzle only nulls a left-joined object whose columns all come from one
    // table; this one mixes employees and departments, so null it explicitly.
    const { employee, ...user } = row;
    return {
      ...user,
      employee:
        employee.id === null
          ? null
          : {
              ...employee,
              id: employee.id,
              departmentId: employee.departmentId!,
              departmentName: employee.departmentName!,
              jobTitle: employee.jobTitle!,
              status: employee.status!,
              hiredAt: employee.hiredAt!,
            },
    };
  }

  async updatePassword(id: number, passwordHash: string) {
    await this.db
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, id));
  }

  async createUser(userData: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }
}
