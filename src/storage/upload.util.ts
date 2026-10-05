import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';

export interface DetectedFile {
  mime: string;
  ext: string;
}

export const DOCUMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  // Office Open XML (zip-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/** pdfkit can only embed these. */
export const IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;

/**
 * Identifies a file by its bytes (the client's content type and name are
 * not trusted) and checks it against `allowed` and `maxBytes`.
 */
export async function inspectUpload(
  file: Express.Multer.File | undefined,
  allowed: readonly string[],
  maxBytes: number,
): Promise<DetectedFile> {
  if (!file || file.size === 0) {
    throw new BadRequestException('A non-empty "file" field is required');
  }
  if (file.size > maxBytes) {
    throw new PayloadTooLargeException(
      `Files are limited to ${maxBytes} bytes`,
    );
  }
  const type = await fileTypeFromBuffer(file.buffer);
  if (!type || !allowed.includes(type.mime)) {
    throw new BadRequestException(
      `Unsupported file type${type ? ` (${type.mime})` : ''}; allowed: ${allowed.join(', ')}`,
    );
  }
  return type;
}

/** Server-chosen key: never derived from the uploaded file name. */
export function storageKey(prefix: string, ext: string) {
  return `${prefix}/${randomUUID()}.${ext}`;
}

/** File name for Content-Disposition (quotes and control chars removed). */
export function safeFileName(name: string, fallbackExt: string) {
  const cleaned = [...name]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/["\\/]/g, '')
    .trim()
    .slice(0, 150);
  return cleaned || `file.${fallbackExt}`;
}
