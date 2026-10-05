import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { EmployeeDirectoryDto } from './employee-response.dto.js';

export class OrgChartNodeDto extends EmployeeDirectoryDto {
  @ApiProperty({ type: () => [OrgChartNodeDto] })
  reports!: OrgChartNodeDto[];
}

export class ReportEntryDto extends EmployeeDirectoryDto {
  @ApiProperty({ example: 1, description: '1 = direct report' })
  depth!: number;
}

export class OrgChartQueryDto {
  @ApiPropertyOptional({
    description: 'Start the tree at this employee instead of the top',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rootId?: number;
}

export class ReportsQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Include indirect reports (whole subtree)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  all?: boolean;
}
