import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto.js';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsInt()
  @IsNotEmpty()
  id!: number;
}
