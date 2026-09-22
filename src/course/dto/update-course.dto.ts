// update-course.schema.ts
import type z from 'zod';
import { createCourseSchema } from './create-course.dto.js';

export const updateCourseSchema = createCourseSchema.partial();

export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
