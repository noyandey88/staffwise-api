import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  /** Same limits as RegisterDto (72 is bcrypt's input limit). */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
