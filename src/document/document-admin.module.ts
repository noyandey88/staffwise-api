import { Module } from '@nestjs/common';
import { DocumentModule } from './document.module.js';
import { UploadLimitsModule } from '../storage/upload-limits.module.js';
import { DocumentAdminController } from './document-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [DocumentModule, UploadLimitsModule],
  controllers: [DocumentAdminController],
})
export class DocumentAdminModule {}
