import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB

@Injectable()
export class MediaService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const production = process.env.NODE_ENV === 'production';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'nour-media';

    if (production) {
      const missing = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']
        .filter((name) => !process.env[name]?.trim());
      if (missing.length) {
        throw new Error(`Missing required production media configuration: ${missing.join(', ')}`);
      }
      if (!endpoint.startsWith('https://')) {
        throw new Error('S3_ENDPOINT must use HTTPS in production.');
      }
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
        secretAccessKey: process.env.S3_SECRET_KEY || 'change-me-local-only',
      },
    });
  }

  async createPresignedUpload(userId: string, contentType: string, byteSize: number, folder: 'posts' | 'stories' | 'avatars' = 'posts') {
    const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);
    if (!isImage && !isVideo) {
      throw new BadRequestException('نوع الملف غير مدعوم. الصور: JPEG/PNG/WebP/GIF — الفيديو: MP4/WebM');
    }
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > maxBytes) {
      throw new BadRequestException(isVideo ? 'حجم الفيديو غير صالح (الحد 40 ميجابايت)' : 'حجم الصورة غير صالح (الحد 8 ميجابايت)');
    }

    const ext =
      contentType === 'image/png'
        ? 'png'
        : contentType === 'image/webp'
          ? 'webp'
          : contentType === 'image/gif'
            ? 'gif'
            : contentType === 'video/webm'
              ? 'webm'
              : contentType === 'video/mp4'
                ? 'mp4'
                : 'jpg';

    const safeFolder = folder === 'stories' || folder === 'avatars' ? folder : 'posts';
    const objectKey = `${safeFolder}/${userId}/${randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: byteSize,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 600 });
    return {
      objectKey,
      uploadUrl,
      mediaType: contentType,
      byteSize,
      expiresIn: 600,
    };
  }

  async getReadUrl(objectKey: string): Promise<string> {
    // Always use short-lived signed URLs. A public base URL could bypass post/story privacy.
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  isAllowedKeyForUser(objectKey: string, userId: string): boolean {
    if (!objectKey || objectKey.includes('..')) return false;
    return (
      objectKey.startsWith(`posts/${userId}/`) ||
      objectKey.startsWith(`stories/${userId}/`) ||
      objectKey.startsWith(`avatars/${userId}/`)
    );
  }
}
