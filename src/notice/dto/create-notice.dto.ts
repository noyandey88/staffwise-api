import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body!: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Target department; omit or null for company-wide',
  })
  @IsOptional()
  @IsInt()
  departmentId?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({
    example: '2026-10-06T09:00:00+06:00',
    description: 'Defaults to now; a future time schedules the notice',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-10-31T23:59:59+06:00',
    description: 'Hidden from the feed from this time on; null never expires',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
