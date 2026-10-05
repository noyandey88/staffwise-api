import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  Put,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiFileUpload } from '../common/decorators/api-file-upload.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { CompanyService } from './company.service.js';
import { UpsertCompanyDto } from './dto/upsert-company.dto.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';

@ApiTags('Admin · Company')
@Controller('admin')
export class CompanyAdminController {
  constructor(private readonly companyService: CompanyService) {}

  @Put('company/logo')
  @Auth()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Upload the company logo',
    description:
      'PNG or JPEG; used by GET /company/logo and the PDF letterhead.',
  })
  @ApiFileUpload()
  @ApiEnvelope(CompanyResponseDto, { message: 'Logo uploaded' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.PAYLOAD_TOO_LARGE,
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.companyService.uploadLogo(file);
  }

  @Delete('company/logo')
  @Auth()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Remove the uploaded logo' })
  @ApiEnvelope(CompanyResponseDto, { message: 'Logo removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  removeLogo() {
    return this.companyService.removeLogo();
  }

  @Put('company')
  @Auth()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Create or replace the company profile' })
  @ApiEnvelope(CompanyResponseDto, {
    message: 'Company profile saved successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  upsert(@Body() dto: UpsertCompanyDto) {
    return this.companyService.upsert(dto);
  }
}
