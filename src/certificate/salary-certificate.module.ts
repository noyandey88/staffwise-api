import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { CompanyModule } from '../company/company.module.js';
import { SalaryCertificateController } from './salary-certificate.controller.js';
import { SalaryCertificateService } from './salary-certificate.service.js';
import { SalaryCertificateRepository } from './salary-certificate.repository.js';

@Module({
  imports: [EmployeesModule, CompanyModule],
  controllers: [SalaryCertificateController],
  providers: [SalaryCertificateService, SalaryCertificateRepository],
})
export class SalaryCertificateModule {}
