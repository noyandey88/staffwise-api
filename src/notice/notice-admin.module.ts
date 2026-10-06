import { Module } from '@nestjs/common';
import { NoticeModule } from './notice.module.js';
import { NoticeAdminController } from './notice-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [NoticeModule],
  controllers: [NoticeAdminController],
})
export class NoticeAdminModule {}
