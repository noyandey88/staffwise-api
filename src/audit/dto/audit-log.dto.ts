import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'User id of the actor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorUserId?: number;

  @ApiPropertyOptional({ example: 'salary.created' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ example: 'employee' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityId?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'From this day (attendance timezone), inclusive',
  })
  @IsOptional()
  @IsDateOnly()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Up to this day (attendance timezone), inclusive',
  })
  @IsOptional()
  @IsDateOnly()
  to?: string;
}

export class AuditLogResponseDto {
  id!: number;
  @ApiProperty({ example: 'payroll_run.approved' })
  action!: string;
  @ApiProperty({ example: 'payroll_run' })
  entityType!: string;
  @ApiProperty({ example: '7' })
  entityId!: string;
  @ApiProperty({
    nullable: true,
    type: Object,
    example: { basePay: { from: '50000.00', to: '55000.00' } },
  })
  changes!: Record<string, { from: unknown; to: unknown }> | null;
  @ApiProperty({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true, type: String })
  ip!: string | null;
  createdAt!: Date;
  @ApiProperty({ nullable: true, type: Number })
  actorUserId!: number | null;
  @ApiProperty({ nullable: true, type: String })
  actorEmail!: string | null;
}
