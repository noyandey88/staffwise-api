import { Module } from '@nestjs/common';
import { UploadLimitsModule } from '../storage/upload-limits.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { DocumentRepository } from './document.repository.js';
import { DocumentAdminController } from './document-admin.controller.js';

@Module({
  imports: [EmployeesModule, UploadLimitsModule],
  controllers: [DocumentController, DocumentAdminController],
  providers: [DocumentService, DocumentRepository],
})
export class DocumentModule {}
