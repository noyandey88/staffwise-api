import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { salaryCertificateStatusEnum } from '../../database/schema/salary-certificate.schema.js';

export type SalaryCertificateStatus =
  (typeof salaryCertificateStatusEnum.enumValues)[number];

export class RequestSalaryCertificateDto {
  @ApiProperty({ example: 'Home loan application' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  purpose!: string;

  @ApiPropertyOptional({
    example: 'The Manager, ABC Bank, Gulshan Branch, Dhaka',
    description: 'Recipient line; omit for "To Whom It May Concern"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressedTo?: string;
}

export class IssueSalaryCertificateDto extends RequestSalaryCertificateDto {
  @IsInt()
  employeeId!: number;
}

export class SalaryCertificateQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: salaryCertificateStatusEnum.enumValues })
  @IsOptional()
  @IsIn(salaryCertificateStatusEnum.enumValues)
  status?: SalaryCertificateStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;
}

export class SalaryCertificateResponseDto {
  id!: number;
  employeeId!: number;
  purpose!: string;
  @ApiProperty({ nullable: true, type: String })
  addressedTo!: string | null;
  @ApiProperty({ enum: salaryCertificateStatusEnum.enumValues })
  status!: SalaryCertificateStatus;
  @ApiProperty({ nullable: true, type: String, example: 'SC-2026-0001' })
  referenceNo!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2026-10-05' })
  issueDate!: string | null;
  @ApiProperty({ nullable: true, type: Number })
  requestedBy!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'User id' })
  reviewedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  reviewedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
