import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService, GetUsersParams } from '../services/userManagementService';
import { RemoveManagerPayload } from '../types';

export function useUsers(params?: GetUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userManagementService.getUsers(params),
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => userManagementService.getUserById(id),
    enabled: !!id,
  });
}

export function useOrgChartRoots() {
  return useQuery({
    queryKey: ['org-chart-roots'],
    queryFn: () => userManagementService.getOrgChartRoots(),
  });
}

export function useOrgChartSubordinates(managerId: string) {
  return useQuery({
    queryKey: ['org-chart-subordinates', managerId],
    queryFn: () => userManagementService.getOrgChartSubordinates(managerId),
    enabled: !!managerId,
  });
}

export function useOrgChartSearch(query: string) {
  return useQuery({
    queryKey: ['org-chart-search', query],
    queryFn: () => userManagementService.searchOrgChart(query),
    enabled: query.trim().length >= 2,
  });
}

export function useCompanyManagers() {
  return useQuery({
    queryKey: ['company-managers'],
    queryFn: () => userManagementService.getCompanyManagers(),
  });
}

export function useSupervisors(targetRole: string, search?: string, companyId?: string, excludeUserId?: string) {
  return useQuery({
    queryKey: ['supervisors', targetRole, search, companyId, excludeUserId],
    queryFn: () => userManagementService.getSupervisors(targetRole, search, companyId, excludeUserId),
    enabled: !!targetRole,
  });
}

export function useUnassignedEmployees() {
  return useQuery({
    queryKey: ['unassigned-employees'],
    queryFn: () => userManagementService.getUnassignedEmployees(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => userManagementService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      userManagementService.updateUser(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['company-managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userManagementService.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userManagementService.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] });
    },
  });
}

export function useRemoveManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ managerId, payload }: { managerId: string; payload: RemoveManagerPayload }) =>
      userManagementService.removeManager(managerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['company-managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] });
    },
  });
}

export function useResetUserCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userManagementService.resetUserCredentials(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] });
    },
  });
}

export function useUserTimeline(userId: string) {
  return useQuery({
    queryKey: ['user-timeline', userId],
    queryFn: () => userManagementService.getUserTimeline(userId),
    enabled: !!userId,
  });
}
