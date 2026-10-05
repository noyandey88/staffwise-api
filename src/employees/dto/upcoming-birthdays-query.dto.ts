import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpcomingBirthdaysQueryDto {
  @ApiPropertyOptional({
    example: 30,
    minimum: 0,
    maximum: 366,
    description: 'Look-ahead window in days, today included (default 30)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(366)
  days?: number;
}
