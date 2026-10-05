import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsLatitude, IsLongitude } from 'class-validator';
import { workLocationEnum } from '../../database/schema/attendance.schema.js';

export type WorkLocation = (typeof workLocationEnum.enumValues)[number];

export class CheckInDto {
  @ApiPropertyOptional({
    enum: workLocationEnum.enumValues,
    description:
      "Defaults to where your work arrangement expects you today (office unless it's a remote day)",
  })
  @IsOptional()
  @IsIn(workLocationEnum.enumValues)
  location?: WorkLocation;

  @ApiPropertyOptional({
    example: 23.7925,
    description:
      'Device latitude; used when office check-ins are verified by location',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 90.4078 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
