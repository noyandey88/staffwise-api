// import { ApiProperty } from '@nestjs/swagger';
// import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// export class CreateCourseDto {
//   @ApiProperty({ example: 'Intro to TypeScript' })
//   @IsString()
//   @IsNotEmpty()
//   @MaxLength(100)
//   name!: string;

//   @ApiProperty({ example: 'A beginner-friendly TypeScript course' })
//   @IsString()
//   @IsNotEmpty()
//   @MaxLength(255)
//   description!: string;

//   @ApiProperty({ example: 'beginner' })
//   @IsString()
//   @IsNotEmpty()
//   @MaxLength(100)
//   level!: string;
// }

import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1).max(100).describe('Intro to Nestjs'),

  description: z
    .string()
    .min(1)
    .max(255)
    .describe('A beginner-friendly TypeScript course'),

  level: z.string().min(1).max(100).describe('beginner'),
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
