import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export interface ApiFileUploadOptions {
  /** Extra multipart text fields: name → Swagger schema. */
  fields?: Record<string, object>;
  required?: string[];
  description?: string;
}

/**
 * multipart/form-data route with one file in the `file` field (kept in
 * memory; the size cap comes from MulterModule in the owning module).
 * The only place an explicit @ApiBody is used: Swagger can't infer a
 * binary body from @UploadedFile.
 */
export function ApiFileUpload(options: ApiFileUploadOptions = {}) {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file')),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: options.description,
      schema: {
        type: 'object',
        required: ['file', ...(options.required ?? [])],
        properties: {
          file: { type: 'string', format: 'binary' },
          ...options.fields,
        },
      },
    }),
  );
}
