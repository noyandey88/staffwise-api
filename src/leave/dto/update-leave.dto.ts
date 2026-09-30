import { PartialType } from '@nestjs/swagger';
import { CreateLeaveDto } from './create-leave.dto.js';

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}
