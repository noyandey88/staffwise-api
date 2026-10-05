import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

export class CreateWorkWeekDto {
  @ApiProperty({
    example: [5, 6],
    type: [Number],
    description:
      'Days off, 0 = Sunday … 6 = Saturday. [5] Friday; [5, 6] Friday–Saturday; ' +
      '[6, 0] Saturday–Sunday; [] no weekend. At least one working day must remain.',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekendDays!: number[];

  @ApiProperty({
    example: '2027-01-01',
    description:
      'Applies from this day on (a past date re-classifies days since then)',
  })
  @IsDateOnly()
  effectiveFrom!: string;
}

export class WorkWeekResponseDto {
  id!: number;
  @ApiProperty({ example: '2026-01-01' })
  effectiveFrom!: string;
  @ApiProperty({ example: [5, 6], type: [Number] })
  weekendDays!: number[];
  @ApiProperty({ example: ['Friday', 'Saturday'], type: [String] })
  weekendDayNames!: string[];
  @ApiProperty({ description: 'In force today' })
  current!: boolean;
}
