// dto/department-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DepartmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Engineering' })
  name!: string;

  @ApiProperty({ nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null;
}
