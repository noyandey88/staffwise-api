import {
  Body,
  Controller,
  Delete,
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
import { NoticeService } from './notice.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';
import { NoticeResponseDto } from './dto/notice-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Auth()
@ApiTags('Notices')
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Publish a notice',
    description:
      'Company-wide unless departmentId is set; a future publishedAt schedules it.',
  })
  @ApiEnvelope(NoticeResponseDto, {
    message: 'Notice created successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateNoticeDto,
  ) {
    return await this.noticeService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Notice board',
    description:
      'Live notices (published, not expired), pinned first then newest. ' +
      'Admin/HR see every department; others see company-wide notices ' +
      'plus their own department.',
  })
  @ApiEnvelope(NoticeResponseDto, {
    message: 'Notices retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async feed(@CurrentUser() user: JwtPayload) {
    return await this.noticeService.feed(user);
  }

  @Get('/all')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'All notices, scheduled and expired included',
  })
  @ApiEnvelope(NoticeResponseDto, {
    message: 'Notices retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.noticeService.findAll(query);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Retrieve a notice' })
  @ApiEnvelope(NoticeResponseDto, {
    message: 'Notice retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.noticeService.findOne(user, id);
  }

  @Patch('/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Update a notice' })
  @ApiEnvelope(NoticeResponseDto, {
    message: 'Notice updated successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoticeDto,
  ) {
    return await this.noticeService.update(id, dto);
  }

  @Delete('/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Delete a notice' })
  @ApiEnvelope(null, { message: 'Notice deleted successfully' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.noticeService.remove(id);
  }
}
