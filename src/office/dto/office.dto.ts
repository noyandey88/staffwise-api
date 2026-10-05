import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOfficeDto {
  @ApiProperty({ example: 'Gulshan HQ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 23.7925 })
  @IsOptional()
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ example: 90.4078 })
  @IsOptional()
  @IsLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 150,
    description:
      'Check-ins within this many metres count (with latitude/longitude)',
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(50_000)
  radiusMeters?: number | null;

  @ApiPropertyOptional({
    example: ['203.0.113.0/24', '2001:db8::/48'],
    type: [String],
    description: 'Office networks (CIDR), as seen by the API',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ipRanges?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {}

export class OfficeResponseDto {
  id!: number;
  name!: string;
  @ApiProperty({ nullable: true, type: Number })
  latitude!: number | null;
  @ApiProperty({ nullable: true, type: Number })
  longitude!: number | null;
  @ApiProperty({ nullable: true, type: Number })
  radiusMeters!: number | null;
  @ApiProperty({ type: [String] })
  ipRanges!: string[];
  isActive!: boolean;
}
