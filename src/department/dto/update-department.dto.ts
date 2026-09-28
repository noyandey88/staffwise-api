import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto.js';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @IsInt()
  @IsNotEmpty()
  id!: number;
}
