import { Global, Module } from '@nestjs/common';
import { AttendancePolicyController } from './attendance-policy.controller.js';
import { AttendancePolicyService } from './attendance-policy.service.js';
import { AttendancePolicyRepository } from './attendance-policy.repository.js';

/** Global: it sets the timezone every module's today() relies on. */
@Global()
@Module({
  controllers: [AttendancePolicyController],
  providers: [AttendancePolicyService, AttendancePolicyRepository],
  exports: [AttendancePolicyService],
})
export class AttendancePolicyModule {}
