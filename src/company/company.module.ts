import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller.js';
import { CompanyService } from './company.service.js';
import { CompanyRepository } from './company.repository.js';
import { UploadLimitsModule } from '../storage/upload-limits.module.js';
import { CompanyAdminController } from './company-admin.controller.js';

@Module({
  imports: [UploadLimitsModule],
  controllers: [CompanyController, CompanyAdminController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyService],
})
export class CompanyModule {}
