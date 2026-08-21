export interface EmployeeRecord {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  email: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  bloodGroup?: string | null;
  role: string;
  status?: 'ACTIVE' | 'INACTIVE';
  isGpsTracked?: boolean;
  isMasterAdmin?: boolean;
  managerId?: string | null;
  attendancePolicyId?: string | null;
  deletedAt: string | null;
  company?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  attendancePolicy?: { id: string; name: string } | null;
  manager?: { id: string; name: string; employeeId?: string; email?: string | null; role?: string } | null;
  _count?: {
    subordinates?: number;
  };
}

export type ReassignmentStrategy = 'move-to-unassigned' | 'move-to-manager' | 'individual';

export interface RemoveManagerPayload {
  strategy: ReassignmentStrategy;
  targetManagerId?: string | null;
  individualAssignments?: Record<string, string | null>;
}

