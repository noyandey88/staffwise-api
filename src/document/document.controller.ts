import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiFileUpload } from '../common/decorators/api-file-upload.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { DocumentService } from './document.service.js';
import {
  DocumentResponseDto,
  UPLOAD_DOCUMENT_FIELDS,
  UploadDocumentDto,
} from './dto/document.dto.js';

const BINARY = {
  description: 'File (not wrapped in the response envelope)',
  schema: { type: 'string', format: 'binary' },
};

@Auth()
@ApiTags('Employee documents')
@Controller()
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  // `me` routes first so ':id' never captures "me".
  @Post('/employees/me/documents')
  @ApiOperation({
    summary: 'Upload a document to my record',
    description:
      'Categories: certificate, photo, other (contracts and IDs are uploaded by HR).',
  })
  @ApiFileUpload({ fields: UPLOAD_DOCUMENT_FIELDS, required: ['category'] })
  @ApiEnvelope(DocumentResponseDto, {
    message: 'Document uploaded',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.PAYLOAD_TOO_LARGE,
  )
  uploadMine(
    @CurrentUser('sub') userId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.uploadMine(userId, file, dto);
  }

  @Get('/employees/me/documents')
  @ApiOperation({ summary: 'My documents' })
  @ApiEnvelope(DocumentResponseDto, {
    message: 'Documents retrieved successfully',
    isArray: true,
  })
  listMine(@CurrentUser('sub') userId: number) {
    return this.service.listMine(userId);
  }

  @Get('/employees/:id/photo')
  @ApiOperation({
    summary: "An employee's photo",
    description: 'Latest photo-category document, inline; any signed-in user.',
  })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse(BINARY)
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  photo(@Param('id', ParseIntPipe) id: number) {
    return this.service.photo(id);
  }

  @Get('/documents/:id/download')
  @ApiOperation({
    summary: 'Download a document',
    description: 'Admin/HR, or the employee it belongs to.',
  })
  @ApiOkResponse(BINARY)
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  download(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.download(user, id);
  }

  @Delete('/documents/:id')
  @ApiOperation({
    summary: 'Delete a document',
    description: 'Admin/HR any; employees only documents they uploaded.',
  })
  @ApiEnvelope(null, { message: 'Document deleted' })
  @ApiErrorResponses(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(user, id);
    return null;
  }
}
