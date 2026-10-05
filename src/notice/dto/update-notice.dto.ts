import { PartialType } from '@nestjs/swagger';
import { CreateNoticeDto } from './create-notice.dto.js';

/** Omitted fields are kept; `departmentId`/`expiresAt` accept null to clear. */
export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
