import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfficeRepository } from './office.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateOfficeDto, UpdateOfficeDto } from './dto/office.dto.js';
import {
  matchOffice,
  parseCidr,
  type VerificationMethod,
} from './office.match.js';
import type { Office } from '../database/schema/office.schema.js';

@Injectable()
export class OfficeService {
  constructor(
    private readonly repository: OfficeRepository,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.repository.findAll();
  }

  async create(dto: CreateOfficeDto) {
    const data = this.normalize(dto, null);
    const row = await this.repository.create({ name: dto.name, ...data });
    if (!row) throw new ConflictException(`Office ${dto.name} already exists`);
    await this.audit.record({
      action: 'office.created',
      entityType: 'office',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async update(id: number, dto: UpdateOfficeDto) {
    const existing = await this.repository.findById(id);
    if (!existing)
      throw new NotFoundException(`Office with id ${id} not found`);
    const row = await this.repository.update(id, {
      name: dto.name ?? undefined,
      ...this.normalize(dto, existing),
    });
    if (row === null)
      throw new ConflictException(`Office ${dto.name} already exists`);
    await this.audit.record({
      action: 'office.updated',
      entityType: 'office',
      entityId: id,
      before: existing,
      after: row,
    });
    return row;
  }

  /** The office an office check-in can be verified against, or null. */
  async verify(
    method: VerificationMethod,
    evidence: { ip?: string; latitude?: number; longitude?: number },
  ) {
    return matchOffice(await this.repository.findAll(), method, evidence);
  }

  /** Coordinates and radius come as a set; CIDRs must parse. */
  private normalize(dto: UpdateOfficeDto, existing: Office | null) {
    const pick = <K extends 'latitude' | 'longitude' | 'radiusMeters'>(k: K) =>
      dto[k] === undefined ? (existing?.[k] ?? null) : dto[k];
    const latitude = pick('latitude');
    const longitude = pick('longitude');
    const radiusMeters = pick('radiusMeters');
    const geo = [latitude, longitude, radiusMeters].filter(
      (v) => v !== null,
    ).length;
    if (geo !== 0 && geo !== 3) {
      throw new BadRequestException(
        'latitude, longitude and radiusMeters must be given together',
      );
    }
    const ipRanges = dto.ipRanges?.map((r) => r.trim());
    const bad = ipRanges?.filter((r) => !parseCidr(r));
    if (bad?.length) {
      throw new BadRequestException(`Invalid CIDR range(s): ${bad.join(', ')}`);
    }
    return {
      latitude,
      longitude,
      radiusMeters,
      ipRanges: ipRanges ?? undefined,
      isActive: dto.isActive ?? undefined,
    };
  }
}
