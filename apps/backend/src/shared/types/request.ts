import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    employeeId: string;
    role: string;
  };
  companyId?: string;
}
