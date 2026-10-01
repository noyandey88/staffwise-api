import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GenerateRunDto {
  @ApiProperty({ example: '2026-09-01', description: 'First day of the month' })
  @IsDateString()
  month!: string;
}
