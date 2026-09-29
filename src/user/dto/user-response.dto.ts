import { UserRole } from '../user.types.js';

/** users row minus password (see UserService safeUser destructuring). */
export class UserResponseDto {
  id!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  role!: UserRole;
  createdAt!: Date | null;
  updatedAt!: Date | null;
}
