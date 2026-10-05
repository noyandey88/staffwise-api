import { ApiProperty } from '@nestjs/swagger';

export class BrandingResponseDto {
  @ApiProperty({ example: 'Staffwise' })
  displayName!: string;

  @ApiProperty({ nullable: true, type: String })
  logoUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  faviconUrl!: string | null;

  @ApiProperty({ nullable: true, type: String, example: '#1E40AF' })
  primaryColor!: string | null;

  @ApiProperty({ nullable: true, type: String, example: '#F59E0B' })
  accentColor!: string | null;

  @ApiProperty({ nullable: true, type: String })
  supportEmail!: string | null;
}

export class CompanyResponseDto extends BrandingResponseDto {
  @ApiProperty({ example: 'Staffwise Technologies Ltd.' })
  legalName!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  website!: string | null;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  taxId!: string | null;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: [5, 6], type: [Number] })
  weekendDays!: number[];

  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}
