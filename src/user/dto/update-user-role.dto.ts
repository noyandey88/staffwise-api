import { IsEnum } from 'class-validator';
import { UserRole } from '../user.types.js';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
