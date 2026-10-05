import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { remoteWorkStatusEnum } from '../../database/schema/remote-work.schema.js';

export type RemoteWorkStatus = (typeof remoteWorkStatusEnum.enumValues)[number];

export class CreateRemoteWorkRequestDto {
  @ApiProperty({ example: '2026-10-12' })
  @IsDateOnly()
  startDate!: string;

  @ApiProperty({ example: '2026-10-13', description: 'Inclusive' })
  @IsDateOnly()
  endDate!: string;

  @ApiProperty({ example: 'Waiting for a home delivery' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}

export class RemoteWorkQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: remoteWorkStatusEnum.enumValues })
  @IsOptional()
  @IsIn(remoteWorkStatusEnum.enumValues)
  status?: RemoteWorkStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;
}

export class RemoteWorkResponseDto {
  id!: number;
  employeeId!: number;
  @ApiProperty({ example: '2026-10-12' })
  startDate!: string;
  @ApiProperty({ example: '2026-10-13' })
  endDate!: string;
  reason!: string;
  @ApiProperty({ enum: remoteWorkStatusEnum.enumValues })
  status!: RemoteWorkStatus;
  @ApiProperty({ nullable: true, type: Number, description: 'User id' })
  reviewedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  reviewedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
