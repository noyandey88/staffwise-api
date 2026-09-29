import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ASSIGNABLE_ROLES, UserRole } from '../user.types.js';

export class UpdateUserRoleDto {
  /** super_admin is excluded: it is only ever seeded, never assigned. */
  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  role!: UserRole;
}
