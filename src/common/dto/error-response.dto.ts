import { ApiProperty } from '@nestjs/swagger';

/** Shape emitted by AllExceptionsFilter for every error response. */
export class ErrorResponseDto {
  success!: boolean;
  status!: string;
  message!: string;

  @ApiProperty({
    example: null,
    type: 'object',
    nullable: true,
    additionalProperties: false,
  })
  payload!: null;
}
