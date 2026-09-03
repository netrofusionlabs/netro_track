import { api } from '../../../shared/services/api';
import { base64ToUint8Array } from '../../../shared/utils/base64';

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
  modules?: Array<{ id: string; module: string; isEnabled: boolean }>;
  capabilityIds?: string[];
  entitledSlugs?: string[];
  entitlements?: Array<{ isEnabled: boolean; capability?: { slug: string; name?: string } }>;
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
  getCompanies: async (search?: string): Promise<CompanyRecord[]> => {
    const params = search ? { search } : undefined;
    const res = await api.get('/companies', { params });
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

  uploadToR2: async (uploadUrl: string, base64Data: string, mimeType: string): Promise<void> => {
    const bytes = base64ToUint8Array(base64Data);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network request failed'));

      // Passing Uint8Array causes React Native to convert to base64 and decode natively to raw binary bytes in OkHttp/NSURLSession
      xhr.send(bytes);
    });
  },

  resetAdminPassword: async (companyId: string, password = 'Password123!') => {
    const res = await api.post(`/companies/${companyId}/reset-admin-password`, { password });
    return res.data;
  },
};
