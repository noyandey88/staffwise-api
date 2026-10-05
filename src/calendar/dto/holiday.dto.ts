import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-12-16' })
  @IsDateOnly()
  date!: string;

  @ApiProperty({ example: 'Victory Day' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class YearQueryDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'Defaults to the current year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class HolidayResponseDto {
  id!: number;
  @ApiProperty({ example: '2026-12-16' })
  date!: string;
  name!: string;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}
