import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  leaveTypeId!: number;

  @ApiProperty({ example: '2026-10-05' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-10-07' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 'Family event', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
