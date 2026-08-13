import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getCompanies(),
  });
}

export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: ['company-detail', id],
    queryFn: () => companyService.getCompanyById(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; code: string }) =>
      companyService.createCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; code?: string } }) =>
      companyService.updateCompany(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-detail', id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
