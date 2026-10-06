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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { OfficeService } from './office.service.js';
import {
  CreateOfficeDto,
  OfficeResponseDto,
  UpdateOfficeDto,
} from './dto/office.dto.js';

@Auth()
@Roles(UserRole.Admin, UserRole.Hr)
@ApiTags('Admin · Offices')
@Controller('offices')
export class OfficeController {
  constructor(private readonly service: OfficeService) {}

  @Get()
  @ApiOperation({ summary: 'Offices' })
  @ApiEnvelope(OfficeResponseDto, {
    message: 'Offices retrieved successfully',
    isArray: true,
  })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Add an office',
    description:
      'Networks (CIDR) and/or a location radius used to verify office check-ins ' +
      "when the attendance policy's officeCheckInVerification is on.",
  })
  @ApiEnvelope(OfficeResponseDto, {
    message: 'Office created',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreateOfficeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Update an office',
    description:
      'Set isActive=false to retire one (records keep referring to it).',
  })
  @ApiEnvelope(OfficeResponseDto, { message: 'Office updated' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOfficeDto) {
    return this.service.update(id, dto);
  }
}
