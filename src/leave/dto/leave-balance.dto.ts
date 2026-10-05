import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class AllocateBalancesDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Limit to these employees; omit for all current staff',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  employeeIds?: number[];
}

export class AllocateBalancesResponseDto {
  @ApiProperty({ description: 'Balances created' })
  created!: number;
  @ApiProperty({ description: 'Already existed, left unchanged' })
  skipped!: number;
}

export class SetBalanceDto {
  @IsInt()
  employeeId!: number;

  @IsInt()
  leaveTypeId!: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(0)
  @Max(366)
  remainingDays!: number;
}

export class SetBalanceResponseDto {
  id!: number;
  employeeId!: number;
  leaveTypeId!: number;
  year!: number;
  remainingDays!: number;
}
