import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ensureLocalDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const localStorage = {
  async upload({ buffer, originalName, mimetype }) {
    const dir = process.env.LOCAL_UPLOAD_DIR || path.resolve('uploads');
    await ensureLocalDir(dir);
    const ext = path.extname(originalName || '') || '';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);
    const publicBase = (process.env.PUBLIC_UPLOAD_BASE_URL || '/uploads').replace(/\/$/, '');
    return {
      url: `${publicBase}/${filename}`,
      filename,
      mimetype,
      size: buffer.length,
      provider: 'local',
    };
  },
};

const s3Storage = {
  async upload({ buffer, originalName, mimetype }) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const region = process.env.STORAGE_REGION;
    const bucket = process.env.STORAGE_BUCKET;
    if (!region || !bucket) throw new Error('S3 storage requires STORAGE_REGION and STORAGE_BUCKET');
    const client = new S3Client({
      region,
      credentials: process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
          }
        : undefined,
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
    });
    const ext = path.extname(originalName || '') || '';
    const key = `${crypto.randomUUID()}${ext}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }));
    const publicBase = process.env.STORAGE_PUBLIC_BASE_URL;
    const url = publicBase
      ? `${publicBase.replace(/\/$/, '')}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return { url, filename: key, mimetype, size: buffer.length, provider: 's3' };
  },
};

export const getStorage = () => {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3') return s3Storage;
  return localStorage;
};
