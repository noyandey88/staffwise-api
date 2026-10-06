import { Module } from '@nestjs/common';
import { CompanyModule } from './company.module.js';
import { UploadLimitsModule } from '../storage/upload-limits.module.js';
import { CompanyAdminController } from './company-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [CompanyModule, UploadLimitsModule],
  controllers: [CompanyAdminController],
})
export class CompanyAdminModule {}
