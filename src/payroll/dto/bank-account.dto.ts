import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Rahim Uddin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  accountHolderName!: string;

  @ApiProperty({ example: 'Dutch-Bangla Bank PLC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @ApiPropertyOptional({ example: 'Gulshan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string;

  @ApiProperty({
    example: '1051100012345',
    description: 'Account number or IBAN (letters and digits only)',
  })
  @Matches(/^[A-Za-z0-9]{6,34}$/, {
    message: 'accountNumber must be 6-34 letters or digits',
  })
  accountNumber!: string;

  @ApiPropertyOptional({ example: '090261726' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{3,20}$/, {
    message: 'routingNumber must be 3-20 letters or digits',
  })
  routingNumber?: string;

  @ApiPropertyOptional({
    description:
      "Make this the salary account. The employee's first account is always primary.",
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class BankAccountResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 4 })
  employeeId!: number;

  @ApiProperty({ example: 'Rahim Uddin' })
  accountHolderName!: string;

  @ApiProperty({ example: 'Dutch-Bangla Bank PLC' })
  bankName!: string;

  @ApiProperty({ nullable: true, type: String })
  branchName!: string | null;

  @ApiProperty({ example: '*********2345', description: 'Masked' })
  accountNumber!: string;

  @ApiProperty({ nullable: true, type: String })
  routingNumber!: string | null;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
