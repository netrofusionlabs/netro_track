# Image Upload Architecture (Cloudflare R2)

NetroTrack utilizes a direct-to-cloud upload architecture for images (User Profile Pictures and Company Logos) to minimize server load and ensure high scalability.

## Data Model
- **File Model**: Represents a stored file, containing its `id`, `objectKey`, `bucket`, `mimeType`, and an enumerated `FileStatus` (`PENDING`, `ACTIVE`, `DELETED`).
- **One-to-One Relations**:
  - `User.profilePictureFileId` -> `File.id` (Unique foreign key on User)
  - `Company.logoFileId` -> `File.id` (Unique foreign key on Company)

## Upload Flow

1. **Pre-signed URL Request (Mobile -> Backend)**
   - The mobile app selects an image using `react-native-image-picker`.
   - The app makes a `POST` request to `/upload-url` providing the `mimeType`.
   - The backend `StorageService` verifies permissions and tenant isolation.
   - The backend creates a `File` record with `status: 'PENDING'`.
   - The backend generates a pre-signed `PutObjectCommand` URL from Cloudflare R2 and returns it along with the `File.id`.

2. **Direct Upload (Mobile -> R2)**
   - The mobile app executes an HTTP `PUT` request directly to the Cloudflare R2 pre-signed URL with the binary file blob.
   - This prevents the backend Node.js server from having to process or proxy large binary files.

3. **Upload Verification (Mobile -> Backend)**
   - After the `PUT` request succeeds, the mobile app makes a `POST` request to `/complete`, passing the `fileId`.
   - The backend `StorageService` executes a `HeadObjectCommand` against R2 to guarantee the file actually exists and wasn't spoofed.
   - If verified, the backend marks the `File` record as `status: 'ACTIVE'`.
   - The backend updates the parent entity (e.g., sets `User.profilePictureFileId` to the `fileId`).

## File Retrieval
- The frontend (Mobile/Web) queries the backend for the `User` or `Company`.
- The backend's Service layer resolves the `objectKey` into a full public URL using the `StorageService`.
- Public assets are served via a fast Cloudflare CDN endpoint.

## Security & Cleanup
- All routes verify authentication.
- Company Logo routes verify that the user has at least `COMPANY_ADMIN` privileges.
- Tenant scoping ensures a user can only upload files associated with their `companyId`.
- A background cron job (or similar mechanism) can periodically delete `PENDING` files older than 24 hours to prune abandoned uploads.
