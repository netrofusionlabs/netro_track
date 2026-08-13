import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';

interface ProfileData {
  id: string;
  companyId: string;
  companyName: string | null;
  employeeId: string;
  name: string;
  role: string;
  managerId: string | null;
  managerName: string | null;
  managerEmployeeId: string | null;
  isGpsTracked: boolean;
  hasMpin: boolean;
}

async function fetchProfile(): Promise<ProfileData> {
  const res = await api.get<{ data: ProfileData }>('/auth/me');
  return res.data.data;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
