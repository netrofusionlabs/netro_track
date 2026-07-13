import { Response, NextFunction } from 'express';
import { CustomerService } from './customer.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';

export class CustomerController {
  private customerService = new CustomerService();

  public getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const customers = await this.customerService.getAllCustomers(companyId);
      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: customers,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const customer = await this.customerService.getCustomerById(companyId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Customer retrieved successfully',
        data: customer,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const createdById = req.user!.id;
      const { name, phone, email, address, village, latitude, longitude, type } = req.body;

      const customer = await this.customerService.createCustomer(companyId, {
        name,
        phone,
        email,
        address,
        village,
        latitude,
        longitude,
        type,
        createdById
      });

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { name, phone, email, address, village, latitude, longitude, type } = req.body;

      const customer = await this.customerService.updateCustomer(companyId, req.params.id, {
        name,
        phone,
        email,
        address,
        village,
        latitude,
        longitude,
        type
      });

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      await this.customerService.deleteCustomer(companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
