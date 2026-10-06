import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiFileUpload } from '../common/decorators/api-file-upload.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../user/user.types.js';
import { DocumentService } from './document.service.js';
import {
  DocumentResponseDto,
  UPLOAD_DOCUMENT_FIELDS,
  UploadDocumentDto,
} from './dto/document.dto.js';

@Auth()
@ApiTags('Admin · Employee documents')
@Controller('employees')
export class DocumentAdminController {
  constructor(private readonly service: DocumentService) {}

  @Post(':id/documents')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "Upload a document to an employee's record" })
  @ApiFileUpload({ fields: UPLOAD_DOCUMENT_FIELDS, required: ['category'] })
  @ApiEnvelope(DocumentResponseDto, {
    message: 'Document uploaded',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.PAYLOAD_TOO_LARGE,
  )
  upload(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.uploadFor(id, file, dto, userId);
  }

  @Get(':id/documents')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "An employee's documents" })
  @ApiEnvelope(DocumentResponseDto, {
    message: 'Documents retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  list(@Param('id', ParseIntPipe) id: number) {
    return this.service.listFor(id);
  }
}
