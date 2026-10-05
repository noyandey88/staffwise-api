import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  leaveTypeId!: number;

  @ApiProperty({ example: '2026-10-05' })
  @IsDateOnly()
  startDate!: string;

  @ApiProperty({ example: '2026-10-07' })
  @IsDateOnly()
  endDate!: string;

  @ApiProperty({ example: 'Family event', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
