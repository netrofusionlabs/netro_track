import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../shared/middlewares/auth.middleware';
import { AuthenticatedRequest } from '../../shared/types/request';
import { AppError } from '../../shared/errors/AppError';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const router = Router();

// Ensure public uploads directory exists inside workspace root or backend root
const uploadsDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate a mock S3/R2 presigned upload URL
router.post('/presigned-url', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      throw new AppError('BAD_REQUEST', 'fileName is required', 400);
    }

    const fileKey = `${crypto.randomUUID()}-${fileName}`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Simulate presigned S3/R2 URL and final image resource URL
    const uploadUrl = `${baseUrl}/api/v1/uploads/mock-file-upload?key=${fileKey}`;
    const resourceUrl = `${baseUrl}/static/uploads/${fileKey}`;

    res.status(200).json({
      success: true,
      message: 'Presigned URL generated successfully',
      data: {
        uploadUrl,
        resourceUrl
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    next(error);
  }
});

// Mock file upload handler (receives binary stream and saves it to local disk)
router.put('/mock-file-upload', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fileKey = req.query.key as string;
    if (!fileKey) {
      throw new AppError('BAD_REQUEST', 'Missing key query parameter', 400);
    }

    const targetPath = path.join(uploadsDir, fileKey);
    const writeStream = fs.createWriteStream(targetPath);
    
    req.pipe(writeStream);

    req.on('end', () => {
      res.status(200).json({
        success: true,
        message: 'Mock file uploaded successfully to local storage',
        data: { key: fileKey }
      });
    });

    req.on('error', (err) => {
      next(err);
    });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRouter };
export { uploadsDir };
