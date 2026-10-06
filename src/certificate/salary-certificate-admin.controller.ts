import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { SalaryCertificateService } from './salary-certificate.service.js';
import {
  IssueSalaryCertificateDto,
  SalaryCertificateQueryDto,
  SalaryCertificateResponseDto,
} from './dto/salary-certificate.dto.js';

@Auth()
@ApiTags('Admin · Salary certificates')
@Controller('salary-certificates')
export class SalaryCertificateAdminController {
  constructor(private readonly service: SalaryCertificateService) {}

  @Get()
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'All salary certificates and requests' })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificates retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  list(@Query() query: SalaryCertificateQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Issue a salary certificate directly',
    description:
      'Snapshots the current salary, job and company details; never for yourself.',
  })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificate issued',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  issueDirect(
    @CurrentUser() user: JwtPayload,
    @Body() dto: IssueSalaryCertificateDto,
  ) {
    return this.service.issueDirect(user, dto);
  }

  @Patch(':id/issue')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Issue a requested salary certificate' })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificate issued',
  })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  issue(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.issueRequest(user, id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Reject a salary certificate request' })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificate request rejected',
  })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.reject(user, id);
  }
}
