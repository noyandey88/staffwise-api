import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditRepository } from './audit.repository.js';
import { AuditController } from './audit.controller.js';

/** Global so any service can inject AuditService. */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
