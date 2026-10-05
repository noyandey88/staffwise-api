import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentRepository,
  type DocumentCategory,
} from './document.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { StorageService } from '../storage/storage.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  inspectUpload,
  safeFileName,
  storageKey,
} from '../storage/upload.util.js';
import { UploadDocumentDto } from './dto/document.dto.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import type { EmployeeDocument } from '../database/schema/employee-document.schema.js';

const DOCUMENT_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

/** What employees may upload to their own record (contracts and IDs are HR's). */
const SELF_SERVICE_CATEGORIES: readonly DocumentCategory[] = [
  'certificate',
  'photo',
  'other',
];

@Injectable()
export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly employeesService: EmployeesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async uploadFor(
    employeeId: number,
    file: Express.Multer.File | undefined,
    dto: UploadDocumentDto,
    uploadedBy: number,
  ) {
    await this.employeesService.findById(employeeId);
    const type = await inspectUpload(
      file,
      dto.category === 'photo' ? IMAGE_TYPES : DOCUMENT_TYPES,
      this.config.get<number>('UPLOAD_MAX_BYTES')!,
    );
    const key = storageKey(`employees/${employeeId}`, type.ext);
    await this.storage.put(key, file!.buffer, type.mime);
    const originalName = safeFileName(file!.originalname, type.ext);
    let row: EmployeeDocument;
    try {
      row = await this.repository.create({
        employeeId,
        category: dto.category,
        title: dto.title ?? originalName,
        fileKey: key,
        originalName,
        contentType: type.mime,
        sizeBytes: file!.size,
        uploadedBy,
      });
    } catch (err) {
      await this.storage.delete(key); // don't leave an orphaned blob
      throw err;
    }
    await this.audit.record({
      action: 'document.uploaded',
      entityType: 'employee_document',
      entityId: row.id,
      metadata: { employeeId, category: row.category, title: row.title },
    });
    return this.toResponse(row);
  }

  async uploadMine(
    userId: number,
    file: Express.Multer.File | undefined,
    dto: UploadDocumentDto,
  ) {
    const me = await this.employeesService.findByUserId(userId);
    if (!SELF_SERVICE_CATEGORIES.includes(dto.category)) {
      throw new ForbiddenException(
        `HR uploads ${dto.category} documents; you can upload: ${SELF_SERVICE_CATEGORIES.join(', ')}`,
      );
    }
    return this.uploadFor(me.id, file, dto, userId);
  }

  async listFor(employeeId: number) {
    await this.employeesService.findById(employeeId);
    const rows = await this.repository.findByEmployee(employeeId);
    return rows.map((r) => this.toResponse(r));
  }

  async listMine(userId: number) {
    const me = await this.employeesService.findByUserId(userId);
    const rows = await this.repository.findByEmployee(me.id);
    return rows.map((r) => this.toResponse(r));
  }

  /** Admin/HR, or the employee the document belongs to. Others: 404. */
  async download(requester: JwtPayload, id: number) {
    const doc = await this.findVisible(requester, id);
    const body = await this.storage.get(doc.fileKey);
    if (!body) throw new NotFoundException('The stored file is missing');
    return new StreamableFile(body, {
      type: doc.contentType,
      disposition: `attachment; filename="${doc.originalName}"`,
      length: body.length,
    });
  }

  /** Admin/HR any; employees only what they uploaded themselves. */
  async remove(requester: JwtPayload, id: number) {
    const doc = await this.findVisible(requester, id);
    if (
      !DOCUMENT_ADMIN_ROLES.includes(requester.role) &&
      doc.uploadedBy !== requester.sub
    ) {
      throw new ForbiddenException(
        'HR uploaded this document; ask HR to remove it',
      );
    }
    await this.repository.remove(id);
    await this.storage.delete(doc.fileKey);
    await this.audit.record({
      action: 'document.deleted',
      entityType: 'employee_document',
      entityId: id,
      metadata: {
        employeeId: doc.employeeId,
        category: doc.category,
        title: doc.title,
      },
    });
  }

  /** Latest photo, shown inline; any signed-in user (directory). */
  async photo(employeeId: number) {
    const [latest] = await this.repository.findByEmployee(employeeId, 'photo');
    const body = latest && (await this.storage.get(latest.fileKey));
    if (!latest || !body) throw new NotFoundException('No photo');
    return new StreamableFile(body, {
      type: latest.contentType,
      disposition: 'inline',
      length: body.length,
    });
  }

  private async findVisible(requester: JwtPayload, id: number) {
    const doc = await this.repository.findById(id);
    if (!doc) throw new NotFoundException('Document not found');
    if (!DOCUMENT_ADMIN_ROLES.includes(requester.role)) {
      const me = await this.employeesService.findOptionalByUserId(
        requester.sub,
      );
      if (me?.id !== doc.employeeId) {
        throw new NotFoundException('Document not found');
      }
    }
    return doc;
  }

  private toResponse(row: EmployeeDocument) {
    const { fileKey: _fileKey, updatedAt: _updatedAt, ...rest } = row;
    return rest;
  }
}
