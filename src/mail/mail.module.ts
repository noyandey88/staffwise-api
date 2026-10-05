import { Global, Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module.js';
import { MailService } from './mail.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationRepository } from './notification.repository.js';

/** Global so any feature can inject NotificationService without importing it. */
@Global()
@Module({
  imports: [CompanyModule],
  providers: [MailService, NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class MailModule {}
