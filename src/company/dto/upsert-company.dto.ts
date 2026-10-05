import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class UpsertCompanyDto {
  @ApiProperty({ example: 'Staffwise Technologies Ltd.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  legalName!: string;

  @ApiProperty({
    example: 'Staffwise',
    description: 'Brand name shown in the client apps',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.svg' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/favicon.ico' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  faviconUrl?: string;

  @ApiPropertyOptional({ example: '#1E40AF' })
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'primaryColor must be a #RRGGBB hex color' })
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'accentColor must be a #RRGGBB hex color' })
  accentColor?: string;

  @ApiPropertyOptional({ example: 'support@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+8801700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: 'House 1, Road 2, Gulshan, Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: 'Farzana Rahman',
    description: 'Signs issued documents such as salary certificates',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  signatoryName?: string;

  @ApiPropertyOptional({ example: 'Head of People Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  signatoryTitle?: string;

  @ApiPropertyOptional({ example: '123456789012', description: 'TIN / VAT ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    example: 'BDT',
    description: 'ISO 4217 code used for payroll; defaults to BDT',
  })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;
}
