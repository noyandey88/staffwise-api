import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/** Backend-agnostic blob store; keys are '/'-separated relative paths. */
interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** undefined when the object does not exist. */
  get(key: string): Promise<Buffer | undefined>;
  delete(key: string): Promise<void>;
}

class LocalDriver implements StorageDriver {
  private readonly root: string;

  constructor(dir: string) {
    this.root = resolve(dir);
  }

  /** Keys are generated server-side, but never let one escape the root. */
  private path(key: string) {
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + sep)) {
      throw new Error(`Storage key escapes the storage root: ${key}`);
    }
    return full;
  }

  async put(key: string, body: Buffer) {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string) {
    try {
      return await readFile(this.path(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

class S3Driver implements StorageDriver {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string) {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return Buffer.from(await res.Body!.transformToByteArray());
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return undefined;
      throw err;
    }
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

/** Stores uploaded files on local disk or S3 (STORAGE_DRIVER). */
@Injectable()
export class StorageService implements StorageDriver {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  constructor(config: ConfigService) {
    if (config.get<string>('STORAGE_DRIVER') === 's3') {
      const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
      this.driver = new S3Driver(
        new S3Client({
          region: config.get<string>('S3_REGION'),
          endpoint: config.get<string>('S3_ENDPOINT'),
          forcePathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE'),
          credentials: accessKeyId
            ? {
                accessKeyId,
                secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY')!,
              }
            : undefined,
        }),
        config.get<string>('S3_BUCKET')!,
      );
    } else {
      this.driver = new LocalDriver(config.get<string>('STORAGE_LOCAL_DIR')!);
    }
  }

  put(key: string, body: Buffer, contentType: string) {
    return this.driver.put(key, body, contentType);
  }

  get(key: string) {
    return this.driver.get(key);
  }

  /** Best effort: a leftover blob is harmless, a failed request is not. */
  async delete(key: string) {
    try {
      await this.driver.delete(key);
    } catch (err) {
      this.logger.error({ err, key }, 'Failed to delete stored file');
    }
  }
}
