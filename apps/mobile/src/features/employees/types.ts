export interface EmployeeRecord {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  email: string | null;
  role: string;
  deletedAt: string | null;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  manager?: { id: string; name: string } | null;
}
