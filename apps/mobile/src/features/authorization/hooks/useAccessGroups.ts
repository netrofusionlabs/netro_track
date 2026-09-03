import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';

export interface AccessGroupItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  _count?: {
    userMembers?: number;
    permissions?: number;
  };
}

export function useAccessGroups(companyId?: string) {
  return useQuery<AccessGroupItem[]>({
    queryKey: ['access-groups', companyId],
    queryFn: async () => {
      const url = companyId ? `/authorization/access-groups?companyId=${companyId}` : '/authorization/access-groups';
      const res = await api.get<{ success: boolean; data: AccessGroupItem[] }>(url);
      return res.data.data || [];
    },
  });
}
