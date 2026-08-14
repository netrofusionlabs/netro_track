import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';
import { prisma } from '../config/prisma';
import mime from 'mime-types';

export class StorageService {
  private static instance: StorageService;
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;

  private constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new AppError(
        'R2_NOT_CONFIGURED',
        'Object storage is not configured. Contact your system administrator.',
        503
      );
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Generates a pre-signed URL for direct-to-R2 upload and creates a PENDING File record.
   */
  public async generateUploadUrl(
    tenantId: string,
    fileType: 'PROFILE_PICTURE' | 'COMPANY_LOGO',
    entityId: string,
    mimeType: string,
    uploadedByUserId: string,
    size: number = 0
  ) {
    const ext = mime.extension(mimeType) || 'bin';
    const purposeDir = fileType === 'PROFILE_PICTURE' ? 'profile-pictures' : 'company-logos';
    const uuid = randomUUID();
    const fileName = `${uuid}.${ext}`;
    const objectKey = `tenants/${tenantId}/${purposeDir}/${entityId}/${fileName}`;

    // Create PENDING file record
    const fileRecord = await prisma.file.create({
      data: {
        tenantId,
        storageProvider: 'CLOUDFLARE_R2',
        bucket: this.bucket,
        objectKey,
        fileName,
        mimeType,
        size,
        fileType,
        status: 'PENDING',
        uploadedByUserId,
      },
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: mimeType,
      Tagging: `tenant=${tenantId}&purpose=${fileType}`,
    });

    const EXPIRY_SECONDS = 900; // 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: EXPIRY_SECONDS });

    return {
      uploadUrl,
      fileId: fileRecord.id,
      objectKey,
      expiresAt: Math.floor(Date.now() / 1000) + EXPIRY_SECONDS,
    };
  }

  /**
   * Verifies an uploaded object in R2 and transitions its DB state to ACTIVE.
   */
  public async completeUpload(fileId: string, tenantId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new AppError('FILE_NOT_FOUND', 'File record not found', 404);
    }

    if (file.status === 'ACTIVE') {
      return file; // Already active
    }

    // Verify object actually exists in R2
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: file.objectKey,
      });
      const headResult = await this.s3Client.send(headCommand);
      
      // We can also update size from R2 if needed
      const actualSize = headResult.ContentLength || file.size;

      const activeFile = await prisma.file.update({
        where: { id: fileId },
        data: { status: 'ACTIVE', size: actualSize },
      });

      return activeFile;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        throw new AppError('FILE_NOT_UPLOADED', 'The object does not exist in R2 yet. Ensure upload completed.', 400);
      }
      throw new AppError('STORAGE_ERROR', 'Failed to verify uploaded object in R2', 500);
    }
  }

  public getPublicUrl(objectKey: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${objectKey}`;
    }
    return ''; // Or return a signed GET URL for private objects
  }
}
