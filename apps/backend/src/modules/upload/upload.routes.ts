/**
 * Upload Routes — Cloudflare R2 pre-signed URL generation. (Reloaded schema check)
 *
 * Flow:
 *  1. Mobile requests a pre-signed URL with { purpose, contentType, entityId }
 *  2. Server generates an S3-compatible PUT pre-signed URL for R2
 *  3. Mobile uploads the image binary directly to R2 using that URL
 *  4. Mobile stores the returned fileKey in the form payload before submit
 *
 * Key rules (BR-IM):
 * - Only image/jpeg accepted (BR-IM04)
 * - Signed URL expires in 15 minutes (BR-IM06)
 * - Path includes companyId for data isolation (BR-IM07)
 * - Images never pass through this API as payloads (BR-IM01)
 */
import { Router, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { AuthenticatedRequest } from '../../shared/types/request';
import { AppError } from '../../shared/errors/AppError';
import { uploadSignRequestSchema } from '@netrotrack/shared';

const router = Router();

// ─── R2 client (S3-compatible) ────────────────────────────────────────────────
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new AppError(
      'R2_NOT_CONFIGURED',
      'Object storage is not configured. Contact your system administrator.',
      503
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ─── POST /api/v1/uploads/presigned-url ───────────────────────────────────────
router.post(
  '/presigned-url',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;

      const validated = uploadSignRequestSchema.parse(req.body);

      const bucket = process.env.R2_BUCKET_NAME;
      if (!bucket) {
        throw new AppError('R2_NOT_CONFIGURED', 'Storage bucket not configured', 503);
      }

      // Build deterministic R2 key: companies/{companyId}/{purpose}/{entityId}/{uuid}.jpg
      const fileKey = `companies/${companyId}/${validated.purpose}/${validated.entityId}/${randomUUID()}.jpg`;

      const client = getR2Client();

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        ContentType: validated.contentType,
        // Tag for lifecycle management
        Tagging: `company=${companyId}&purpose=${validated.purpose}`,
      });

      // Pre-signed URL expires in 15 minutes (BR-IM06)
      const EXPIRY_SECONDS = 900;
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: EXPIRY_SECONDS });

      const publicBaseUrl = process.env.R2_PUBLIC_URL ?? '';
      const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${fileKey}` : '';

      res.status(200).json({
        success: true,
        message: 'Pre-signed upload URL generated',
        data: {
          uploadUrl,
          fileKey,
          publicUrl,
          expiresAt: Math.floor(Date.now() / 1000) + EXPIRY_SECONDS,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/v1/uploads/file ─────────────────────────────────────────────
router.delete(
  '/file',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileKey } = req.body;
      if (!fileKey) {
        throw new AppError('MISSING_KEY', 'fileKey is required', 400);
      }

      const companyId = req.user!.companyId;
      // Security Check: prevent users from deleting files outside their company folder
      if (!fileKey.startsWith(`companies/${companyId}/`)) {
        throw new AppError('FORBIDDEN', 'You do not have permission to delete this file', 403);
      }

      const bucket = process.env.R2_BUCKET_NAME;
      if (!bucket) {
        throw new AppError('R2_NOT_CONFIGURED', 'Storage bucket not configured', 503);
      }

      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        })
      );

      res.status(200).json({
        success: true,
        message: 'File deleted from storage',
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as uploadRouter };
