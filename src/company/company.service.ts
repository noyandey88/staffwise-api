import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service.js';
import {
  IMAGE_TYPES,
  inspectUpload,
  storageKey,
} from '../storage/upload.util.js';
import type { CompanyProfile } from '../database/schema/company.schema.js';
import { CompanyRepository } from './company.repository.js';
import { UpsertCompanyDto } from './dto/upsert-company.dto.js';
import { DEFAULT_WEEKEND_DAYS } from '../calendar/calendar.constants.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /** API shape: the storage key stays internal. */
  toResponse(profile: CompanyProfile) {
    const { logoFileKey, logoContentType: _type, ...rest } = profile;
    return { ...rest, hasUploadedLogo: logoFileKey !== null };
  }

  /** PNG/JPEG only, so the PDF letterhead can embed it. */
  async uploadLogo(file: Express.Multer.File | undefined) {
    const before = await this.find();
    const type = await inspectUpload(
      file,
      IMAGE_TYPES,
      this.config.get<number>('UPLOAD_MAX_BYTES')!,
    );
    const key = storageKey('company', type.ext);
    await this.storage.put(key, file!.buffer, type.mime);
    const after = await this.companyRepository.setLogo(key, type.mime);
    if (before.logoFileKey) await this.storage.delete(before.logoFileKey);
    await this.audit.record({
      action: 'company.logo_uploaded',
      entityType: 'company',
      entityId: after.id,
      metadata: { contentType: type.mime, sizeBytes: file!.size },
    });
    return this.toResponse(after);
  }

  async removeLogo() {
    const before = await this.find();
    if (!before.logoFileKey) return this.toResponse(before);
    const after = await this.companyRepository.setLogo(null, null);
    await this.storage.delete(before.logoFileKey);
    await this.audit.record({
      action: 'company.logo_removed',
      entityType: 'company',
      entityId: after.id,
    });
    return this.toResponse(after);
  }

  /** Raw bytes for the PDF letterhead; undefined when none is uploaded. */
  async logoBytes(profile: CompanyProfile | undefined) {
    if (!profile?.logoFileKey) return undefined;
    return this.storage.get(profile.logoFileKey);
  }

  async logo() {
    const profile = await this.findOptional();
    const body = await this.logoBytes(profile);
    if (!profile || !body) throw new NotFoundException('No logo uploaded');
    return new StreamableFile(body, {
      type: profile.logoContentType!,
      disposition: 'inline',
      length: body.length,
    });
  }

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
      hasUploadedLogo: p.logoFileKey !== null,
    };
  }

  /** PUT semantics: omitted optional fields are cleared. */
  async upsert(dto: UpsertCompanyDto) {
    const before = await this.companyRepository.find();
    const after = await this.companyRepository.upsert({
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
      signatoryName: dto.signatoryName ?? null,
      signatoryTitle: dto.signatoryTitle ?? null,
      currency: dto.currency ?? 'BDT',
      weekendDays: [...(dto.weekendDays ?? DEFAULT_WEEKEND_DAYS)].sort(),
    });
    await this.audit.record({
      action: before ? 'company.updated' : 'company.created',
      entityType: 'company',
      entityId: after.id,
      before,
      after,
    });
    return this.toResponse(after);
  }
}
