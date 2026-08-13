import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    employeeId: string;
    role: Role;
    isMasterAdmin?: boolean;
  };
  companyId?: string;
}

