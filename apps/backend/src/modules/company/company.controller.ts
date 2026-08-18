import { Response, NextFunction } from 'express';
import { CompanyService } from './company.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { AuthorizationService } from '../../shared/services/authorization.service';
import { CreateCompanyWizardInput, UpdateCompanyInput } from '@netrotrack/shared';

export class CompanyController {
  private companyService = new CompanyService();
  private authService = new AuthorizationService();

  public getCompanies = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await this.companyService.getAllCompanies();
      res.status(200).json({
        success: true,
        message: 'Companies retrieved successfully',
        data: companies,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'MASTER_SUPER_ADMIN') {
        this.authService.assertCompanyScope(req.user!, req.params.id);
      }
      const company = await this.companyService.getCompanyById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Company retrieved successfully',
        data: company,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as CreateCompanyWizardInput;
      const company = await this.companyService.createCompanyWizard(payload);
      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: company,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as UpdateCompanyInput;
      const company = await this.companyService.updateCompany(req.params.id, payload);
      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: company,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getLogoUploadUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mimeType } = req.body;
      const targetCompanyId = req.params.id;
      
      // Ensure the actor is authorized for this company
      this.authService.assertCompanyScope(req.user!, targetCompanyId);

      if (!mimeType || !mimeType.startsWith('image/')) {
        throw new AppError('INVALID_FILE_TYPE', 'Only image files are allowed', 400);
      }
      
      const { id: userId } = req.user!;
      
      // We will inject the StorageService inside the method, or we can just import it
      // Actually we need to import StorageService at the top of the file
      const storageService = (await import('../../shared/services/storage.service')).StorageService.getInstance();
      
      const result = await storageService.generateUploadUrl(
        targetCompanyId,
        'COMPANY_LOGO',
        targetCompanyId,
        mimeType,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Company logo upload URL generated',
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public completeLogoUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.body;
      const targetCompanyId = req.params.id;

      this.authService.assertCompanyScope(req.user!, targetCompanyId);

      if (!fileId) {
        throw new AppError('MISSING_FILE_ID', 'fileId is required', 400);
      }

      const storageService = (await import('../../shared/services/storage.service')).StorageService.getInstance();
      const activeFile = await storageService.completeUpload(fileId, targetCompanyId);
      
      if (activeFile.fileType !== 'COMPANY_LOGO') {
        throw new AppError('INVALID_FILE_TYPE', 'File is not a company logo', 400);
      }

      const { prisma } = await import('../../shared/config/prisma');
      await prisma.company.update({
        where: { id: targetCompanyId },
        data: { logoFileId: activeFile.id },
      });

      const publicUrl = storageService.getPublicUrl(activeFile.objectKey);

      res.status(200).json({
        success: true,
        message: 'Company logo updated successfully',
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

  public deleteCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.companyService.deleteCompany(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
