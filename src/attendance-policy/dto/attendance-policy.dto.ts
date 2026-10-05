import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

/** Omitted fields are copied from the policy in force on effectiveFrom. */
export class CreateAttendancePolicyDto {
  @ApiProperty({
    example: '2026-11-01',
    description: 'Applies from this day on; earlier days keep their policy',
  })
  @IsDateOnly()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    example: 'Asia/Dhaka',
    description: 'IANA timezone name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'HH:mm, local time' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'workStartTime must be HH:mm (24h)',
  })
  workStartTime?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Late after work start + grace',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  lateGraceMinutes?: number;

  @ApiPropertyOptional({
    example: 480,
    description: 'Minutes beyond this are overtime',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  standardWorkMinutes?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'How far back corrections may reach',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(366)
  correctionWindowDays?: number;

  @ApiPropertyOptional({
    example: 24,
    description: 'Longest shift a correction may record',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  maxShiftHours?: number;
}

export class AttendancePolicyResponseDto {
  id!: number;
  @ApiProperty({ example: '1900-01-01' })
  effectiveFrom!: string;
  @ApiProperty({ example: 'Asia/Dhaka' })
  timezone!: string;
  @ApiProperty({ example: '09:00' })
  workStartTime!: string;
  @ApiProperty({ example: 15 })
  lateGraceMinutes!: number;
  @ApiProperty({ example: '09:15', description: 'Late after this local time' })
  lateAfter!: string;
  @ApiProperty({ example: 480 })
  standardWorkMinutes!: number;
  @ApiProperty({ example: 30 })
  correctionWindowDays!: number;
  @ApiProperty({ example: 24 })
  maxShiftHours!: number;
  @ApiProperty({ description: 'In force today' })
  current!: boolean;
}
