import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Normalizes so `Ada@Example.com ` and `ada@example.com` are one account. */
const normalizeEmail = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value,
);

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @normalizeEmail
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email!: string;

  /** 72 is bcrypt's input limit; longer passwords would be silently truncated. */
  @ApiPropertyOptional({
    description:
      'Optional initial password. Either way the user is emailed a link to set their own.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}

export class ForgotPasswordDto {
  @normalizeEmail
  @IsEmail()
  @MaxLength(100)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  /** Same limits as RegisterDto (72 is bcrypt's input limit). */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

export class LoginDto {
  @normalizeEmail
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
