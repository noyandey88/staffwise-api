import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { attendanceCorrectionStatusEnum } from '../../database/schema/attendance.schema.js';

export type AttendanceCorrectionStatus =
  (typeof attendanceCorrectionStatusEnum.enumValues)[number];

export class CreateAttendanceCorrectionDto {
  @ApiProperty({ example: '2026-10-04', description: 'The day to correct' })
  @IsDateOnly()
  workDate!: string;

  @ApiPropertyOptional({
    example: '2026-10-04T09:02:00+06:00',
    description:
      'Corrected check-in; must fall on workDate (attendance timezone). ' +
      'Required when the day has no record yet; omit to keep the recorded one.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  checkInAt?: string;

  @ApiPropertyOptional({
    example: '2026-10-04T18:05:00+06:00',
    description: 'Corrected check-out; omit to keep the recorded one',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  checkOutAt?: string;

  @ApiProperty({ example: 'Forgot to check out' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}

export class AttendanceCorrectionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Employee id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional({ enum: attendanceCorrectionStatusEnum.enumValues })
  @IsOptional()
  @IsIn(attendanceCorrectionStatusEnum.enumValues)
  status?: AttendanceCorrectionStatus;
}

export class AttendanceCorrectionResponseDto {
  id!: number;
  employeeId!: number;
  @ApiProperty({ example: '2026-10-04' })
  workDate!: string;
  @ApiProperty({ nullable: true, type: Date })
  checkInAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  checkOutAt!: Date | null;
  reason!: string;
  @ApiProperty({ enum: attendanceCorrectionStatusEnum.enumValues })
  status!: AttendanceCorrectionStatus;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'User id of the reviewer',
  })
  reviewedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  reviewedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
