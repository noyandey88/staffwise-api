import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { NoticeService } from './notice.service.js';
import { NoticeResponseDto } from './dto/notice-response.dto.js';

@Auth()
@ApiTags('Notices')
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

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
}
