import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { SalaryCertificateService } from './salary-certificate.service.js';
import {
  RequestSalaryCertificateDto,
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
