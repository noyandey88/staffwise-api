import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { BloodGroup } from '../employees.enum.js';

const PHONE = /^\+?[0-9][0-9 ()-]{5,28}$/;

/**
 * Details an employee may maintain themselves (PATCH /employees/me/profile)
 * and HR may set on create/update. null clears a field.
 */
export class EmployeeContactDto {
  @ApiPropertyOptional({ example: '+8801700000000', nullable: true })
  @IsOptional()
  @Matches(PHONE, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'House 1, Road 2, Gulshan, Dhaka',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  presentAddress?: string | null;

  @ApiPropertyOptional({ example: 'Village X, Comilla', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  permanentAddress?: string | null;

  @ApiPropertyOptional({ enum: BloodGroup, nullable: true })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup | null;

  @ApiPropertyOptional({ example: 'Rahim Uddin', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  emergencyContactName?: string | null;

  @ApiPropertyOptional({ example: 'Brother', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emergencyContactRelationship?: string | null;

  @ApiPropertyOptional({ example: '+8801800000000', nullable: true })
  @IsOptional()
  @Matches(PHONE, {
    message: 'emergencyContactPhone must be a valid phone number',
  })
  emergencyContactPhone?: string | null;
}
