import { ApiProperty } from '@nestjs/swagger';

export class NoticeResponseDto {
  id!: number;
  title!: string;
  body!: string;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'null = company-wide',
  })
  departmentId!: number | null;

  pinned!: boolean;
  publishedAt!: Date;

  @ApiProperty({ nullable: true, type: Date })
  expiresAt!: Date | null;

  @ApiProperty({ description: 'User id of the author' })
  createdBy!: number;

  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}
