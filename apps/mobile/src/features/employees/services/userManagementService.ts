import { api } from '../../../shared/services/api';
import { EmployeeRecord, RemoveManagerPayload } from '../types';

export interface GetUsersParams {
  role?: string;
  status?: string;
  managerId?: string;
  search?: string;
  tab?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUsersResponse {
  items: EmployeeRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export const userManagementService = {
  getUsers: async (params?: GetUsersParams): Promise<PaginatedUsersResponse> => {
    const res = await api.get('/user-management', { params });
    return {
      items: res.data.data,
      pagination: res.data.pagination || {
        page: 1,
        pageSize: 20,
        totalItems: res.data.data.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    };
  },

  getUserById: async (id: string): Promise<EmployeeRecord> => {
    const res = await api.get(`/user-management/${id}`);
    return res.data.data;
  },

  createUser: async (payload: any): Promise<EmployeeRecord> => {
    const res = await api.post('/user-management', payload);
    return res.data.data;
  },

  updateUser: async (id: string, payload: any): Promise<EmployeeRecord> => {
    const res = await api.put(`/user-management/${id}`, payload);
    return res.data.data;
  },

  deactivateUser: async (id: string): Promise<EmployeeRecord> => {
    const res = await api.post(`/user-management/${id}/deactivate`);
    return res.data.data;
  },

  activateUser: async (id: string): Promise<EmployeeRecord> => {
    const res = await api.post(`/user-management/${id}/activate`);
    return res.data.data;
  },

  getCompanyManagers: async (): Promise<EmployeeRecord[]> => {
    const res = await api.get('/user-management/managers');
    return res.data.data;
  },

  getUnassignedEmployees: async (): Promise<EmployeeRecord[]> => {
    const res = await api.get('/user-management/unassigned');
    return res.data.data;
  },

  removeManager: async (managerId: string, payload: RemoveManagerPayload): Promise<{ message: string; reassignedCount: number }> => {
    const res = await api.post(`/user-management/${managerId}/remove-manager`, payload);
    return res.data.data;
  },

  getSupervisors: async (targetRole: string, search?: string, companyId?: string, excludeUserId?: string): Promise<EmployeeRecord[]> => {
    const res = await api.get('/user-management/supervisors', {
      params: {
        targetRole,
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(companyId ? { companyId } : {}),
        ...(excludeUserId ? { excludeUserId } : {}),
      },
    });
    return res.data.data;
  },

  resetUserCredentials: async (id: string): Promise<{ message: string; defaultPassword?: string }> => {
    const res = await api.post(`/user-management/${id}/reset-credentials`);
    return res.data.data;
  },

  getUserTimeline: async (id: string): Promise<any[]> => {
    const res = await api.get(`/user-management/${id}/timeline`);
    return res.data.data;
  },
};
