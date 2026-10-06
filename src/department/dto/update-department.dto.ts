import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto.js';

/** The department id comes from the path (PATCH /admin/departments/:id). */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
