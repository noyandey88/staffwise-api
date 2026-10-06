import { Module } from '@nestjs/common';
import { SalaryCertificateModule } from './salary-certificate.module.js';
import { SalaryCertificateAdminController } from './salary-certificate-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [SalaryCertificateModule],
  controllers: [SalaryCertificateAdminController],
})
export class SalaryCertificateAdminModule {}
