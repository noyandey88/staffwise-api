import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CompanyService } from './company.service.js';
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
}
