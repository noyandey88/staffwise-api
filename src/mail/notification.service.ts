import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService, type MailMessage } from './mail.service.js';
import { NotificationRepository } from './notification.repository.js';
import { type Brand, type Recipient, templates } from './mail.templates.js';
import { CompanyService } from '../company/company.service.js';

const DEFAULT_BRAND: Brand = { name: 'Staffwise', color: '#1E40AF' };

/**
 * Domain emails. Event methods (leave, attendance, payroll) run in the
 * background: they return immediately, and a failure is logged, never
 * propagated to the request that triggered it.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly repository: NotificationRepository,
    private readonly companyService: CompanyService,
    private readonly config: ConfigService,
  ) {}

  /** Awaited: the caller decides how to handle a failure. */
  async sendPasswordReset(r: Recipient, token: string) {
    const seconds = this.config.get<number>('PASSWORD_RESET_EXPIRES_IN')!;
    await this.mail.send(
      templates.passwordReset(
        r,
        await this.brand(),
        this.link('/reset-password', token),
        Math.round(seconds / 60),
      ),
    );
  }

  accountCreated(r: Recipient, token: string) {
    this.background('account setup', async () => {
      const seconds = this.config.get<number>('ACCOUNT_SETUP_EXPIRES_IN')!;
      return [
        templates.accountSetup(
          r,
          await this.brand(),
          this.link('/reset-password', token),
          Math.round(seconds / 3600),
        ),
      ];
    });
  }

  /** Tells the employee's direct manager, if they have one. */
  leaveSubmitted(request: {
    employeeId: number;
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    days: number;
  }) {
    this.background('leave submitted', async () => {
      const who = await this.repository.employeeWithManager(request.employeeId);
      if (!who?.managerEmail) return [];
      return [
        templates.leaveSubmitted(
          { email: who.managerEmail, firstName: who.managerFirstName! },
          await this.brand(),
          {
            employeeName: `${who.firstName} ${who.lastName}`,
            type: await this.repository.leaveTypeName(request.leaveTypeId),
            start: request.startDate,
            end: request.endDate,
            days: request.days,
          },
        ),
      ];
    });
  }

  leaveDecided(request: {
    employeeId: number;
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    status: string;
  }) {
    this.background('leave decided', async () => {
      const who = await this.repository.employeeWithManager(request.employeeId);
      if (!who) return [];
      return [
        templates.leaveDecided(who, await this.brand(), {
          type: await this.repository.leaveTypeName(request.leaveTypeId),
          start: request.startDate,
          end: request.endDate,
          approved: request.status === 'approved',
        }),
      ];
    });
  }

  correctionDecided(correction: {
    employeeId: number;
    workDate: string;
    status: string;
  }) {
    this.background('correction decided', async () => {
      const who = await this.repository.employeeWithManager(
        correction.employeeId,
      );
      if (!who) return [];
      return [
        templates.correctionDecided(who, await this.brand(), {
          workDate: correction.workDate,
          approved: correction.status === 'approved',
        }),
      ];
    });
  }

  /** month: YYYY-MM-DD (first of month) as stored on payroll_runs. */
  payslipsReleased(runId: number, month: string) {
    this.background('payslips released', async () => {
      const brand = await this.brand();
      const label = month.slice(0, 7);
      const recipients = await this.repository.payslipRecipients(runId);
      return recipients.map((r) => templates.payslipReady(r, brand, label));
    });
  }

  private background(event: string, build: () => Promise<MailMessage[]>) {
    void (async () => {
      const messages = await build();
      // Sequential: the SMTP pool queues anyway, and one bad address
      // must not stop the rest.
      for (const message of messages) {
        try {
          await this.mail.send(message);
        } catch (err) {
          this.logger.error(
            { err, to: message.to },
            `Failed to send ${event} email`,
          );
        }
      }
    })().catch((err: unknown) =>
      this.logger.error({ err }, `Failed to prepare ${event} email`),
    );
  }

  private link(path: string, token: string) {
    const base = this.config.get<string>('WEB_APP_URL')!.replace(/\/+$/, '');
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }

  private async brand(): Promise<Brand> {
    const company = await this.companyService.findOptional();
    return company
      ? {
          name: company.displayName,
          color: company.primaryColor ?? DEFAULT_BRAND.color,
        }
      : DEFAULT_BRAND;
  }
}
