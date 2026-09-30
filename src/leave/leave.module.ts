import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
