import { Module } from '@nestjs/common';
import { OfficeController } from './office.controller.js';
import { OfficeService } from './office.service.js';
import { OfficeRepository } from './office.repository.js';

@Module({
  controllers: [OfficeController],
  providers: [OfficeService, OfficeRepository],
  exports: [OfficeService],
})
export class OfficeModule {}
