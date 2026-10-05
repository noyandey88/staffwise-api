import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { SalaryCertificateRepository } from './salary-certificate.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CompanyService } from '../company/company.service.js';
import { NotificationService } from '../mail/notification.service.js';
import {
  IssueSalaryCertificateDto,
  RequestSalaryCertificateDto,
  SalaryCertificateQueryDto,
} from './dto/salary-certificate.dto.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';
import { today } from '../attendance/attendance.util.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import {
  type SalaryCertificate,
  type SalaryCertificateSnapshot,
} from '../database/schema/salary-certificate.schema.js';
import { renderSalaryCertificatePdf } from './salary-certificate.pdf.js';

/** Roles that issue certificates and see everyone's. */
const CERTIFICATE_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

@Injectable()
export class SalaryCertificateService {
  constructor(
    private readonly repository: SalaryCertificateRepository,
    private readonly employeesService: EmployeesService,
    private readonly companyService: CompanyService,
    private readonly notifications: NotificationService,
  ) {}

  // --- employee ---

  async request(userId: number, dto: RequestSalaryCertificateDto) {
    const employee = await this.employeesService.findByUserId(userId);
    const row = await this.repository.createRequest({
      employeeId: employee.id,
      purpose: dto.purpose,
      addressedTo: dto.addressedTo ?? null,
      requestedBy: userId,
    });
    if (!row) {
      throw new ConflictException(
        'You already have an open salary certificate request',
      );
    }
    return this.toResponse(row);
  }

  async mine(userId: number) {
    const employee = await this.employeesService.findByUserId(userId);
    const rows = await this.repository.findByEmployee(employee.id);
    return rows.map((r) => this.toResponse(r));
  }

  async cancel(userId: number, id: number) {
    const employee = await this.employeesService.findByUserId(userId);
    const row = await this.repository.cancel(id, employee.id);
    if (row) return this.toResponse(row);
    const existing = await this.repository.findById(id);
    if (!existing || existing.employeeId !== employee.id) {
      throw new NotFoundException('Salary certificate not found');
    }
    throw new ConflictException('Only open requests can be cancelled');
  }

  // --- HR ---

  async list(query: SalaryCertificateQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.repository.findPage(
      { status: query.status, employeeId: query.employeeId },
      window,
    );
    return paginated(
      items.map((r) => this.toResponse(r)),
      total,
      window,
    );
  }

  async issueDirect(requester: JwtPayload, dto: IssueSalaryCertificateDto) {
    await this.assertNotOwn(requester, dto.employeeId);
    const snapshot = await this.snapshot(dto.employeeId);
    const row = await this.repository.createIssued({
      employeeId: dto.employeeId,
      purpose: dto.purpose,
      addressedTo: dto.addressedTo ?? null,
      reviewedBy: requester.sub,
      snapshot,
    });
    this.notifications.certificateDecided(row);
    return this.toResponse(row);
  }

  async issueRequest(requester: JwtPayload, id: number) {
    const existing = await this.findOpen(id);
    await this.assertNotOwn(requester, existing.employeeId);
    const snapshot = await this.snapshot(existing.employeeId);
    const row = await this.repository.issueRequest(id, requester.sub, snapshot);
    if (!row) throw new ConflictException('Only open requests can be issued');
    this.notifications.certificateDecided(row);
    return this.toResponse(row);
  }

  async reject(requester: JwtPayload, id: number) {
    const existing = await this.findOpen(id);
    await this.assertNotOwn(requester, existing.employeeId);
    const row = await this.repository.reject(id, requester.sub);
    if (!row) throw new ConflictException('Only open requests can be rejected');
    this.notifications.certificateDecided(row);
    return this.toResponse(row);
  }

  /** Owner or Admin/HR; issued certificates only. Others get 404. */
  async pdf(requester: JwtPayload, id: number) {
    const row = await this.repository.findById(id);
    let allowed = CERTIFICATE_ADMIN_ROLES.includes(requester.role);
    if (row && !allowed) {
      const me = await this.employeesService.findOptionalByUserId(
        requester.sub,
      );
      allowed = me?.id === row.employeeId;
    }
    if (!row || !allowed || row.status !== 'issued' || !row.snapshot) {
      throw new NotFoundException('Salary certificate not found');
    }

    const pdf = await renderSalaryCertificatePdf({
      company: await this.companyService.findOptional(),
      referenceNo: row.referenceNo!,
      purpose: row.purpose,
      addressedTo: row.addressedTo,
      snapshot: row.snapshot,
    });
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="salary-certificate-${row.referenceNo}.pdf"`,
    });
  }

  // --- helpers ---

  /**
   * Freezes what the certificate states. Requires a company profile, a
   * current employee and a salary in effect today.
   */
  private async snapshot(
    employeeId: number,
  ): Promise<SalaryCertificateSnapshot> {
    const [profile, company] = await Promise.all([
      this.employeesService.profileForDocument(employeeId),
      this.companyService.findOptional(),
    ]);
    if (!company) {
      throw new ConflictException(
        'Set up the company profile before issuing certificates',
      );
    }
    if (SIGN_IN_BLOCKED_STATUSES.includes(profile.status)) {
      throw new ConflictException(
        `Salary certificates are only issued to current staff (status: ${profile.status})`,
      );
    }
    const issueDate = today();
    const salary = await this.repository.salaryOn(employeeId, issueDate);
    if (!salary) {
      throw new ConflictException('The employee has no salary in effect today');
    }

    return {
      employeeName: `${profile.firstName} ${profile.lastName}`,
      employeeCode: profile.employeeCode,
      jobTitle: profile.jobTitle,
      departmentName: profile.departmentName,
      employmentType: profile.employmentType,
      hiredAt: profile.hiredAt,
      currency: company.currency,
      basePay: salary.basePay,
      allowances: salary.allowances,
      grossPay: (Number(salary.basePay) + Number(salary.allowances)).toFixed(2),
      companyLegalName: company.legalName,
      signatoryName: company.signatoryName,
      signatoryTitle: company.signatoryTitle,
      issueDate,
    };
  }

  private async findOpen(id: number) {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException('Salary certificate not found');
    if (row.status !== 'requested') {
      throw new ConflictException('This request is no longer open');
    }
    return row;
  }

  /** HR can't certify their own salary. */
  private async assertNotOwn(requester: JwtPayload, employeeId: number) {
    const me = await this.employeesService.findOptionalByUserId(requester.sub);
    if (me?.id === employeeId) {
      throw new ForbiddenException(
        'You cannot issue a salary certificate for yourself',
      );
    }
  }

  private toResponse(row: SalaryCertificate) {
    const { snapshot, updatedAt: _updatedAt, ...rest } = row;
    return { ...rest, issueDate: snapshot?.issueDate ?? null };
  }
}
