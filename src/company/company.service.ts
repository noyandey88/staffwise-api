import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from './company.repository.js';
import { UpsertCompanyDto } from './dto/upsert-company.dto.js';
import { DEFAULT_WEEKEND_DAYS } from '../calendar/calendar.constants.js';

@Injectable()
export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async find() {
    const profile = await this.companyRepository.find();
    if (!profile) {
      throw new NotFoundException('Company profile has not been set up');
    }
    return profile;
  }

  /** Optional for callers that work without a profile (e.g. payroll export). */
  async findOptional() {
    return await this.companyRepository.find();
  }

  async branding() {
    const p = await this.find();
    return {
      displayName: p.displayName,
      logoUrl: p.logoUrl,
      faviconUrl: p.faviconUrl,
      primaryColor: p.primaryColor,
      accentColor: p.accentColor,
      supportEmail: p.supportEmail,
    };
  }

  /** PUT semantics: omitted optional fields are cleared. */
  async upsert(dto: UpsertCompanyDto) {
    return await this.companyRepository.upsert({
      legalName: dto.legalName,
      displayName: dto.displayName,
      logoUrl: dto.logoUrl ?? null,
      faviconUrl: dto.faviconUrl ?? null,
      primaryColor: dto.primaryColor ?? null,
      accentColor: dto.accentColor ?? null,
      supportEmail: dto.supportEmail ?? null,
      phone: dto.phone ?? null,
      website: dto.website ?? null,
      address: dto.address ?? null,
      taxId: dto.taxId ?? null,
      currency: dto.currency ?? 'BDT',
      weekendDays: [...(dto.weekendDays ?? DEFAULT_WEEKEND_DAYS)].sort(),
    });
  }
}
