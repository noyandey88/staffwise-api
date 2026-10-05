import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto.js';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'With a new departmentId: the day the move took effect (default today; not in the future)',
  })
  @IsOptional()
  @IsDateOnly()
  transferDate?: string;
}
