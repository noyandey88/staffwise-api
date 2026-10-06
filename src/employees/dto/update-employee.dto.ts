import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto.js';
import { IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

/** The employee id comes from the path (PATCH /admin/employees/:id). */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'With a new departmentId: the day the move took effect (default today; not in the future)',
  })
  @IsOptional()
  @IsDateOnly()
  transferDate?: string;
}
