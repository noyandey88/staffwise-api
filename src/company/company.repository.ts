import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import {
  type CompanyProfile,
  companyProfile,
  type NewCompanyProfile,
} from '../database/schema/company.schema.js';

@Injectable()
export class CompanyRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async find(): Promise<CompanyProfile | undefined> {
    return await this.db.query.companyProfile.findFirst();
  }

  async setLogo(fileKey: string | null, contentType: string | null) {
    const [profile] = await this.db
      .update(companyProfile)
      .set({ logoFileKey: fileKey, logoContentType: contentType })
      .where(eq(companyProfile.id, 1))
      .returning();
    return profile;
  }

  async upsert(data: Omit<NewCompanyProfile, 'id'>): Promise<CompanyProfile> {
    const [profile] = await this.db
      .insert(companyProfile)
      .values({ ...data, id: 1 })
      .onConflictDoUpdate({ target: companyProfile.id, set: data })
      .returning();
    return profile;
  }
}
