import { api } from '../../../shared/services/api';

export interface CompanyRecord {
  id: string;
  name: string;
  code: string;
  isGpsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    users?: number;
    branches?: number;
    departments?: number;
  };
}

export const companyService = {
  getCompanies: async (): Promise<CompanyRecord[]> => {
    const res = await api.get('/companies');
    return res.data.data;
  },

  getCompanyById: async (id: string): Promise<CompanyRecord> => {
    const res = await api.get(`/companies/${id}`);
    return res.data.data;
  },

  createCompany: async (payload: { name: string; code: string; isGpsEnabled?: boolean }): Promise<CompanyRecord> => {
    const res = await api.post('/companies', payload);
    return res.data.data;
  },

  updateCompany: async (id: string, payload: { name?: string; code?: string }): Promise<CompanyRecord> => {
    const res = await api.put(`/companies/${id}`, payload);
    return res.data.data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};
