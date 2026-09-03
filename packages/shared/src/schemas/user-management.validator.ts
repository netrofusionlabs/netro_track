import { z } from 'zod';
import { UserRole, UserStatus } from '../constants/roles';

export const createUserSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Official Work Email is required').email('Invalid work email address'),
  personalEmail: z.string().email('Invalid personal email address').optional().nullable().or(z.literal('')),
  phone: z.string().min(1, 'Primary mobile number is required'),
  secondaryPhone: z.string().optional().nullable(),
  emergencyContactName: z.string().min(1, 'Emergency contact person name is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone number is required'),
  linkedinUrl: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(UserRole),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  branchId: z.string().uuid('Invalid branch ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  designationId: z.string().uuid('Invalid designation ID').optional().nullable(),
  designationName: z.string().min(1, 'Designation / Job Title is required'),
  companyId: z.string().uuid('Invalid company ID').optional(),
  isGpsTracked: z.boolean().optional(),
  attendancePolicyId: z.string().uuid('Invalid policy ID').optional().nullable(),
  accessGroupIds: z.array(z.string().uuid('Invalid access group ID')).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  personalEmail: z.string().email('Invalid personal email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isGpsTracked: z.boolean().optional(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  branchId: z.string().uuid('Invalid branch ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  designationId: z.string().uuid('Invalid designation ID').optional().nullable(),
  designationName: z.string().optional().nullable(),
  attendancePolicyId: z.string().uuid('Invalid policy ID').optional().nullable(),
  accessGroupIds: z.array(z.string().uuid('Invalid access group ID')).optional(),
  isPromotion: z.boolean().optional(),
  effectiveDate: z.string().optional(),
});

export const ReassignmentStrategyEnum = z.enum([
  'move-to-unassigned',
  'move-to-manager',
  'individual',
]);

export const removeManagerSchema = z.object({
  strategy: ReassignmentStrategyEnum,
  targetManagerId: z.string().uuid('Invalid target manager ID').optional().nullable(),
  individualAssignments: z.record(z.string(), z.string().nullable()).optional(),
}).refine((data) => {
  if (data.strategy === 'move-to-manager' && !data.targetManagerId) {
    return false;
  }
  return true;
}, {
  message: 'Target manager ID is required when strategy is move-to-manager',
  path: ['targetManagerId'],
});

export const reassignEmployeesSchema = z.object({
  employeeIds: z.array(z.string().uuid('Invalid employee ID')),
  newManagerId: z.string().uuid('Invalid manager ID').nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ReassignmentStrategy = z.infer<typeof ReassignmentStrategyEnum>;
export type RemoveManagerInput = z.infer<typeof removeManagerSchema>;
export type ReassignEmployeesInput = z.infer<typeof reassignEmployeesSchema>;
