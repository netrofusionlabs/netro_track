import { api } from '../../../shared/services/api';
import axios from 'axios';

export interface CompanyRecord {
  id: string;
  name: string;
  code: string;
  officialEmail?: string;
  country?: string;
  legalName?: string;
  industry?: string;
  companyType?: string;
  employeeCount?: string;
  website?: string;
  phone?: string;
  isGpsEnabled?: boolean;
  taxId?: string;
  registrationNumber?: string;
  timezone?: string;
  currency?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  companyLogoUrl?: string;
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

  updateCompany: async (id: string, payload: Partial<CompanyRecord>): Promise<CompanyRecord> => {
    const res = await api.put(`/companies/${id}`, payload);
    return res.data.data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },

  getLogoUploadUrl: async (companyId: string, mimeType: string) => {
    const res = await api.post(`/companies/${companyId}/logo/upload-url`, { mimeType });
    return res.data.data;
  },

  completeLogoUpload: async (companyId: string, fileId: string) => {
    const res = await api.post(`/companies/${companyId}/logo/complete`, { fileId });
    return res.data.data;
  },

  uploadToR2: async (uploadUrl: string, imageUri: string, mimeType: string) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    await axios.put(uploadUrl, blob, {
      headers: {
        'Content-Type': mimeType,
      },
    });
  }
};
