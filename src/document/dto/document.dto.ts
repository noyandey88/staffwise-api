import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { documentCategoryEnum } from '../../database/schema/employee-document.schema.js';
import type { DocumentCategory } from '../document.repository.js';

/** Multipart text fields that accompany the file. */
export class UploadDocumentDto {
  @ApiProperty({ enum: documentCategoryEnum.enumValues })
  @IsIn(documentCategoryEnum.enumValues)
  category!: DocumentCategory;

  @ApiPropertyOptional({
    example: 'Employment contract 2026',
    description: 'Defaults to the file name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;
}

export const UPLOAD_DOCUMENT_FIELDS = {
  category: { type: 'string', enum: documentCategoryEnum.enumValues },
  title: { type: 'string', maxLength: 150 },
};

export class DocumentResponseDto {
  id!: number;
  employeeId!: number;
  @ApiProperty({ enum: documentCategoryEnum.enumValues })
  category!: DocumentCategory;
  title!: string;
  originalName!: string;
  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;
  sizeBytes!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'User id' })
  uploadedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
