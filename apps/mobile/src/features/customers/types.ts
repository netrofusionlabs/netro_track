export interface CustomerRecord {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  village: string | null;
  type: string | null;
  createdAt: string;
}
