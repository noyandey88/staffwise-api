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
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
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
  RequestSalaryCertificateDto,
  SalaryCertificateQueryDto,
  SalaryCertificateResponseDto,
} from './dto/salary-certificate.dto.js';

@Auth()
@ApiTags('Salary certificates')
@Controller('salary-certificates')
export class SalaryCertificateController {
  constructor(private readonly service: SalaryCertificateService) {}

  @Post('/request')
  @ApiOperation({
    summary: 'Request a salary certificate',
    description: 'One open request at a time; HR issues or rejects it.',
  })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificate requested',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  request(
    @CurrentUser('sub') userId: number,
    @Body() dto: RequestSalaryCertificateDto,
  ) {
    return this.service.request(userId, dto);
  }

  @Get('/me')
  @ApiOperation({ summary: 'My salary certificates and requests' })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificates retrieved successfully',
    isArray: true,
  })
  mine(@CurrentUser('sub') userId: number) {
    return this.service.mine(userId);
  }

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

  @Post('/issue')
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

  @Patch('/:id/issue')
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

  @Patch('/:id/reject')
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

  @Patch('/:id/cancel')
  @ApiOperation({ summary: 'Cancel my open request' })
  @ApiEnvelope(SalaryCertificateResponseDto, {
    message: 'Salary certificate request cancelled',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancel(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(userId, id);
  }

  @Get('/:id/pdf')
  @ApiOperation({
    summary: 'Download an issued salary certificate (PDF)',
    description: 'The employee it belongs to, or Admin/HR.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF attachment (not wrapped in the response envelope)',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  pdf(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.pdf(user, id);
  }
}
