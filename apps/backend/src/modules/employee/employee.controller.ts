import { Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { AppError } from '../../shared/errors/AppError';

export class EmployeeController {
  private employeeService = new EmployeeService();

  public getEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role as Role;
      
      let filter = {};
      if (role === Role.MANAGER) {
        filter = { managerId: req.user!.id };
      }

      const employees = await this.employeeService.getAllEmployees(companyId, filter);
      res.status(200).json({
        success: true,
        message: 'Employees retrieved successfully',
        data: employees,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role as Role;
      const targetId = req.params.id;

      // Managers can only view their subordinates
      if (role === Role.MANAGER) {
        const employee = await this.employeeService.getEmployeeById(companyId, targetId);
        if (employee.managerId !== req.user!.id && employee.id !== req.user!.id) {
          throw new AppError('FORBIDDEN', 'Access denied to this employee record', 403);
        }
        res.status(200).json({
          success: true,
          message: 'Employee retrieved successfully',
          data: employee,
          meta: { timestamp: new Date().toISOString() }
        });
        return;
      }

      const employee = await this.employeeService.getEmployeeById(companyId, targetId);
      res.status(200).json({
        success: true,
        message: 'Employee retrieved successfully',
        data: employee,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { employeeId, name, email, password, role, managerId, branchId, departmentId, designationId } = req.body;

      const employee = await this.employeeService.createEmployee(companyId, {
        employeeId,
        name,
        email,
        password,
        role,
        managerId,
        branchId,
        departmentId,
        designationId
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const role = req.user!.role as Role;
      const targetId = req.params.id;

      // Admin can update anything. Self can update name/password.
      if (role !== Role.COMPANY_ADMIN && targetId !== req.user!.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to edit this record', 403);
      }

      const { name, email, password, role: targetRole, managerId, branchId, departmentId, designationId } = req.body;
      const updateData: {
        name?: string;
        email?: string | null;
        password?: string;
        role?: Role;
        managerId?: string | null;
        branchId?: string | null;
        departmentId?: string | null;
        designationId?: string | null;
      } = {};
      
      if (role === Role.COMPANY_ADMIN) {
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (password !== undefined) updateData.password = password;
        if (targetRole !== undefined) updateData.role = targetRole;
        if (managerId !== undefined) updateData.managerId = managerId;
        if (branchId !== undefined) updateData.branchId = branchId;
        if (departmentId !== undefined) updateData.departmentId = departmentId;
        if (designationId !== undefined) updateData.designationId = designationId;
      } else {
        // Self edit limits
        if (name !== undefined) updateData.name = name;
        if (password !== undefined) updateData.password = password;
      }

      const employee = await this.employeeService.updateEmployee(companyId, targetId, updateData);
      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: employee,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      await this.employeeService.deleteEmployee(companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
