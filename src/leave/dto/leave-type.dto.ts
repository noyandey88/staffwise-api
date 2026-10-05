import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeaveTypeDto {
  @ApiProperty({ example: 'Annual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    example: 20,
    description: 'Working days granted per year by balance allocation',
  })
  @IsInt()
  @Min(0)
  @Max(366)
  defaultDaysPerYear!: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'Paid leave draws on the balance; unpaid leave needs no balance and is deducted in payroll',
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}

export class LeaveTypeResponseDto {
  id!: number;
  name!: string;
  defaultDaysPerYear!: number;
  isPaid!: boolean;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}
