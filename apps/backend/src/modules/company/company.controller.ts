import { Response, NextFunction } from 'express';
import { CompanyService } from './company.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';

export class CompanyController {
  private companyService = new CompanyService();

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
      const { name, code, isGpsEnabled } = req.body;
      const company = await this.companyService.createCompany({ name, code, isGpsEnabled });
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
      const { name, code, isGpsEnabled } = req.body;
      const company = await this.companyService.updateCompany(req.params.id, { name, code, isGpsEnabled });
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

  public deleteCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.companyService.deleteCompany(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
