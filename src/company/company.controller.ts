import { Body, Controller, Get, HttpStatus, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Company profile' })
  @ApiEnvelope(CompanyResponseDto, {
    message: 'Company profile retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  find() {
    return this.companyService.find();
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
