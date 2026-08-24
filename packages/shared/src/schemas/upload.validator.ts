import { z } from 'zod';

// ─── Upload Purpose ───────────────────────────────────────────────────────────
/** Allowed upload contexts — maps to R2 path prefix per company. */
export const UPLOAD_PURPOSES = [
  'visits',
  'inspections',
  'employees',
  'products',
  'companies',
  'attendance',
] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

// ─── Pre-signed URL Request ───────────────────────────────────────────────────
export const uploadSignRequestSchema = z.object({
  /** The feature context this image belongs to. Determines R2 path. */
  purpose: z.enum(UPLOAD_PURPOSES, {
    errorMap: () => ({
      message: `purpose must be one of: ${UPLOAD_PURPOSES.join(', ')}`,
    }),
  }),

  /** Content-Type of the file being uploaded. Only JPEG is accepted. */
  contentType: z
    .literal('image/jpeg', {
      errorMap: () => ({ message: 'Only image/jpeg uploads are accepted' }),
    })
    .default('image/jpeg'),

  entityId: z
    .string()
    .min(1, 'entityId is required')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'entityId must be a valid UUID or identifier (alphanumeric, hyphens, and underscores only)'
    ),
});

export type UploadSignRequestInput = z.infer<typeof uploadSignRequestSchema>;

// ─── Pre-signed URL Response ──────────────────────────────────────────────────
export interface UploadSignResponse {
  /** The pre-signed PUT URL to upload the file directly to R2. */
  uploadUrl: string;

  /** The R2 object key — store this in the database as the image reference. */
  fileKey: string;

  /** Public URL of the file after upload is complete. */
  publicUrl: string;

  /** Unix timestamp (seconds) when the pre-signed URL expires. */
  expiresAt: number;
}
