import { Response, NextFunction } from 'express';
import { StorageService } from '../../shared/services/storage.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { prisma } from '../../shared/config/prisma';
import { AppError } from '../../shared/errors/AppError';

export class ProfileController {
  private storageService = StorageService.getInstance();

  public getUploadUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mimeType } = req.body;
      if (!mimeType || !mimeType.startsWith('image/')) {
        throw new AppError('INVALID_FILE_TYPE', 'Only image files are allowed', 400);
      }
      
      const { id: userId, companyId } = req.user!;
      
      const result = await this.storageService.generateUploadUrl(
        companyId,
        'PROFILE_PICTURE',
        userId,
        mimeType,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Profile picture upload URL generated',
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public completeUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.body;
      if (!fileId) {
        throw new AppError('MISSING_FILE_ID', 'fileId is required', 400);
      }

      const { id: userId, companyId } = req.user!;

      // 1. Mark file as ACTIVE via StorageService
      const activeFile = await this.storageService.completeUpload(fileId, companyId);
      
      if (activeFile.fileType !== 'PROFILE_PICTURE' || activeFile.uploadedByUserId !== userId) {
        throw new AppError('FORBIDDEN', 'You can only complete your own profile picture uploads', 403);
      }

      // 2. Link the active file to the User's profilePictureFileId
      await prisma.user.update({
        where: { id: userId },
        data: { profilePictureFileId: activeFile.id },
      });

      // 3. Return the new public URL
      const publicUrl = this.storageService.getPublicUrl(activeFile.objectKey);

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          fileId: activeFile.id,
          publicUrl
        },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
