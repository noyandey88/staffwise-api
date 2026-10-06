import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { AttendancePolicyService } from './attendance-policy.service.js';
import { AttendancePolicyResponseDto } from './dto/attendance-policy.dto.js';

@Auth()
@ApiTags('Attendance policy')
@Controller('attendance-policies')
export class AttendancePolicyController {
  constructor(private readonly service: AttendancePolicyService) {}

  @Get()
  @ApiOperation({
    summary: 'Attendance policy history',
    description:
      'Timezone, work start, late grace, standard minutes and correction limits; ' +
      'newest first, `current` is in force today.',
  })
  @ApiEnvelope(AttendancePolicyResponseDto, {
    message: 'Attendance policies retrieved successfully',
    isArray: true,
  })
  list() {
    return this.service.list();
  }
}
