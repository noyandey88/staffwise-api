import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { passwordResetTokens } from '../database/schema/password-reset-token.schema.js';

@Injectable()
export class PasswordResetRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** Replaces the user's earlier links (used or not): only the newest works, one row per user. */
  async issue(
    userId: number,
    tokenHash: string,
    purpose: 'reset' | 'setup',
    expiresAt: Date,
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      await tx
        .insert(passwordResetTokens)
        .values({ userId, tokenHash, purpose, expiresAt });
    });
  }

  async latestForUser(userId: number) {
    return this.db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.userId, userId),
      orderBy: desc(passwordResetTokens.createdAt),
    });
  }

  /**
   * Marks a live token used and returns its user id; undefined when the
   * token is unknown, used or expired. Atomic, so a link works once even
   * under concurrent requests.
   */
  async consume(tokenHash: string): Promise<number | undefined> {
    const now = new Date();
    const [row] = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    return row?.userId;
  }
}
