import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Thin wrapper over nodemailer. MAIL_TRANSPORT=log only logs messages,
 * so development works without an SMTP server.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;
  private readonly logBodies: boolean;

  constructor(config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM')!;
    const isProduction = config.get<string>('NODE_ENV') === 'production';
    // Bodies carry one-time links; never log them in production.
    this.logBodies = !isProduction;

    if (config.get<string>('MAIL_TRANSPORT') === 'smtp') {
      const user = config.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        pool: true,
        host: config.get<string>('SMTP_HOST'),
        port: config.get<number>('SMTP_PORT'),
        secure: config.get<boolean>('SMTP_SECURE'),
        auth: user
          ? { user, pass: config.get<string>('SMTP_PASSWORD') }
          : undefined,
      });
    } else if (isProduction) {
      this.logger.warn(
        'MAIL_TRANSPORT=log in production: emails are not being sent',
      );
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        this.logBodies
          ? {
              mail: {
                to: message.to,
                subject: message.subject,
                text: message.text,
              },
            }
          : { mail: { to: message.to, subject: message.subject } },
        'Email (MAIL_TRANSPORT=log, not sent)',
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...message });
  }

  onApplicationShutdown() {
    this.transporter?.close();
  }
}
