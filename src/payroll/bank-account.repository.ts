import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, eq, ne } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type EmployeeBankAccount,
  employeeBankAccounts,
  type NewEmployeeBankAccount,
} from '../database/schema/payroll.schema.js';

@Injectable()
export class BankAccountRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmployee(employeeId: number): Promise<EmployeeBankAccount[]> {
    return await this.db.query.employeeBankAccounts.findMany({
      where: eq(employeeBankAccounts.employeeId, employeeId),
      orderBy: asc(employeeBankAccounts.id),
    });
  }

  async findById(id: number): Promise<EmployeeBankAccount | undefined> {
    return await this.db.query.employeeBankAccounts.findFirst({
      where: eq(employeeBankAccounts.id, id),
    });
  }

  /** The employee's first account becomes primary regardless of the flag. */
  async create(data: NewEmployeeBankAccount): Promise<EmployeeBankAccount> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.employeeBankAccounts.findMany({
        where: eq(employeeBankAccounts.employeeId, data.employeeId),
      });
      if (existing.some((a) => a.accountNumber === data.accountNumber)) {
        throw new ConflictException(
          'This account is already registered for the employee',
        );
      }

      const isPrimary = data.isPrimary === true || existing.length === 0;
      if (isPrimary) {
        await tx
          .update(employeeBankAccounts)
          .set({ isPrimary: false })
          .where(eq(employeeBankAccounts.employeeId, data.employeeId));
      }

      const [account] = await tx
        .insert(employeeBankAccounts)
        .values({ ...data, isPrimary })
        .returning();
      return account;
    });
  }

  async setPrimary(id: number): Promise<EmployeeBankAccount> {
    return this.db.transaction(async (tx) => {
      const account = await tx.query.employeeBankAccounts.findFirst({
        where: eq(employeeBankAccounts.id, id),
      });
      if (!account) {
        throw new NotFoundException(`Bank account with id ${id} not found`);
      }

      // Clear first: the partial unique index allows one primary at a time.
      await tx
        .update(employeeBankAccounts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(employeeBankAccounts.employeeId, account.employeeId),
            ne(employeeBankAccounts.id, id),
          ),
        );
      const [updated] = await tx
        .update(employeeBankAccounts)
        .set({ isPrimary: true })
        .where(eq(employeeBankAccounts.id, id))
        .returning();
      return updated;
    });
  }

  async remove(id: number): Promise<void> {
    await this.db
      .delete(employeeBankAccounts)
      .where(eq(employeeBankAccounts.id, id));
  }
}
