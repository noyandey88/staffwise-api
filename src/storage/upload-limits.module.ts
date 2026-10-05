import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

/**
 * Import into any module with upload routes. No `dest`/`storage`: multer
 * keeps the file in memory (its type is sniffed before storing) and
 * rejects oversize uploads with 413 instead of buffering them.
 */
export const UploadLimitsModule = MulterModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    limits: {
      fileSize: config.get<number>('UPLOAD_MAX_BYTES'),
      files: 1,
      fields: 10,
    },
  }),
});
