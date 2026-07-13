# Image Upload Architecture

> **Purpose:** Define the direct-to-storage image upload strategy using signed URLs.
> **Scope:** Upload flow, compression, signed URL lifecycle, R2 integration.
> **Dependencies:** [System Architecture](system-architecture.md), [Offline Architecture](offline-architecture.md)

---

## 1. Design Decision

Images MUST NOT pass through the API server as large payloads. Instead, the mobile app uploads directly to Cloudflare R2 using pre-signed URLs.

| Approach | Throughput | Server Load | Scalability | **Decision** |
|----------|-----------|-------------|-------------|:------------:|
| Upload via API (multipart) | Slow | High | Limited | ❌ |
| **Direct to R2 (signed URL)** | Fast | Minimal | Excellent | ✅ |

---

## 2. Upload Flow

```
Mobile App                           API Server                      Cloudflare R2
    │                                     │                              │
    │  1. POST /api/v1/uploads/sign       │                              │
    │  { fileType, purpose, entityId }    │                              │
    │────────────────────────────────────▶│                              │
    │                                     │                              │
    │                                     │  2. Generate signed PUT URL  │
    │                                     │     (S3-compatible API)      │
    │                                     │─────────────────────────────▶│
    │                                     │                              │
    │  3. Return { uploadUrl, fileKey }   │                              │
    │◀────────────────────────────────────│                              │
    │                                     │                              │
    │  4. PUT image directly to R2        │                              │
    │     (using signed URL)              │                              │
    │────────────────────────────────────────────────────────────────────▶│
    │                                     │                              │
    │  5. Upload complete (200 OK)        │                              │
    │◀───────────────────────────────────────────────────────────────────│
    │                                     │                              │
    │  6. POST /api/v1/visits             │                              │
    │  { ..., imageUrl: fileKey }         │                              │
    │────────────────────────────────────▶│                              │
    │                                     │  7. Store URL in PostgreSQL  │
    │                                     │                              │
```

---

## 3. Image Processing (Client-Side)

Before uploading, the mobile app MUST process images:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max file size | 2MB (after compression) | Network efficiency |
| Format | JPEG | Universal, good compression |
| Quality | 80% | Balance quality vs. size |
| Max dimension | 1920px (longest edge) | Sufficient for verification |
| EXIF data | Strip (except GPS if relevant) | Privacy, file size |

```typescript
// Using react-native-image-picker options
const imageOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1920,
  includeBase64: false,
};
```

---

## 4. R2 Storage Structure

```
netrotrack-bucket/
├── companies/
│   └── {companyId}/
│       ├── logos/
│       │   └── logo_{timestamp}.jpg
│       ├── visits/
│       │   └── {visitId}/
│       │       ├── selfie_{timestamp}.jpg
│       │       └── photo_{timestamp}_{index}.jpg
│       ├── inspections/
│       │   └── {inspectionId}/
│       │       └── photo_{timestamp}_{index}.jpg
│       ├── products/
│       │   └── {productId}.jpg
│       └── employees/
│           └── {employeeId}/
│               └── avatar_{timestamp}.jpg
```

### Key Format

```
companies/{companyId}/{purpose}/{entityId}/{filename}
```

This structure ensures:
- Company data isolation at the storage level.
- Easy bulk operations (delete all company data).
- Predictable URL patterns.

---

## 5. Signed URL Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Expiry | 15 minutes | Enough time to upload, short enough for security |
| HTTP method | PUT | Upload only, no delete or list |
| Content type | image/jpeg | Restrict to JPEG only |
| Max size | 5MB | Safety margin above 2MB target |

```typescript
// Server-side signed URL generation
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async generateUploadUrl(companyId: string, purpose: string, entityId: string): Promise<SignedUrlResponse> {
  const fileKey = `companies/${companyId}/${purpose}/${entityId}/${Date.now()}.jpg`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: 'image/jpeg',
  });
  
  const uploadUrl = await getSignedUrl(this.s3Client, command, {
    expiresIn: 900, // 15 minutes
  });
  
  return { uploadUrl, fileKey };
}
```

---

## 6. Image Retrieval

For displaying images:

| Scenario | Strategy |
|----------|---------|
| Company logos | Public URL with CDN caching |
| Product images | Public URL with CDN caching |
| Visit selfies/photos | Signed GET URL (time-limited) |
| Inspection photos | Signed GET URL (time-limited) |
| Employee avatars | Signed GET URL (time-limited) |

### Signed Read URLs

```typescript
// Generate read URL with 1-hour expiry
async getReadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });
  
  return getSignedUrl(this.s3Client, command, {
    expiresIn: 3600, // 1 hour
  });
}
```

---

## 7. Offline Image Handling

```
Offline:
    │
    1. Employee takes photo
    │
    2. Photo saved to device's temp directory
    │
    3. Image upload item added to sync queue (priority: 6)
    │
    4. Visit/inspection metadata added to sync queue (priority: 3)
    │
Online:
    │
    5. Metadata syncs first (imageUrl = null or placeholder)
    │
    6. Image syncs: request signed URL → upload to R2 → get key
    │
    7. PATCH the entity with the image URL
```

---

## 8. Cleanup and Retention

| Scenario | Action |
|----------|--------|
| Orphaned uploads (signed URL used, but entity never created) | Cleanup job: delete files older than 24 hours without entity reference |
| Company deleted | Bulk delete all files under `companies/{companyId}/` |
| Visit deleted (soft) | Keep images (soft delete means data preserved) |
| Storage quota (future) | Per-company storage limits |

---

## Future Considerations

- **Image thumbnails:** Generate thumbnails for list views (via Cloudflare Workers or server-side).
- **Video support:** Short video clips for inspections.
- **Watermarking:** Add timestamp and GPS watermark to verification photos.
- **Face detection:** Validate selfies contain a face before accepting.
- **CDN caching:** Cloudflare CDN for frequently accessed images (logos, product images).

---

## Best Practices

- Never store image blobs in PostgreSQL — URLs only.
- Always compress and resize images on the client before upload.
- Use signed URLs with short expiry for both upload and download.
- Include company ID in the storage path for tenant isolation.
- Log all upload operations for auditing.
- Handle upload failures gracefully — retry with new signed URL if expired.
