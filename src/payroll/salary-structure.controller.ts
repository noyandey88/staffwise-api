import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SalaryStructureService } from './salary-structure.service.js';
import { SalaryStructureResponseDto } from './dto/salary-structure.dto.js';

@Auth()
@ApiTags('Payroll')
@Controller('payroll')
export class SalaryStructureController {
  constructor(
    private readonly salaryStructureService: SalaryStructureService,
  ) {}

  @Get('/salary/me')
  @ApiOperation({ summary: 'My salary history (newest first)' })
  @ApiEnvelope(SalaryStructureResponseDto, {
    message: 'Salary history retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findMine(@CurrentUser('sub') userId: number) {
    return this.salaryStructureService.findMine(userId);
  }
}
