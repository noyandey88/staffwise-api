import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Put,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiFileUpload } from '../common/decorators/api-file-upload.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { CompanyService } from './company.service.js';
import { UpsertCompanyDto } from './dto/upsert-company.dto.js';
import {
  BrandingResponseDto,
  CompanyResponseDto,
} from './dto/company-response.dto.js';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // Public on purpose: clients theme the login screen before a user exists.
  @Get('/branding')
  @ApiOperation({ summary: 'White-label branding (public)' })
  @ApiEnvelope(BrandingResponseDto, {
    message: 'Branding retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  branding() {
    return this.companyService.branding();
  }

  // Public like /branding: the login screen shows it.
  @Get('/logo')
  @ApiOperation({ summary: 'Uploaded company logo (public)' })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse({
    description: 'Image (not wrapped in the response envelope)',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  logo() {
    return this.companyService.logo();
  }

  @Put('/logo')
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

  @Delete('/logo')
  @Auth()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Remove the uploaded logo' })
  @ApiEnvelope(CompanyResponseDto, { message: 'Logo removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  removeLogo() {
    return this.companyService.removeLogo();
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Company profile' })
  @ApiEnvelope(CompanyResponseDto, {
    message: 'Company profile retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async find() {
    return this.companyService.toResponse(await this.companyService.find());
  }

  @Put()
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
