import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class GenerateRunDto {
  @ApiProperty({ example: '2026-09', description: 'Payroll month (YYYY-MM)' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month!: string;
}
