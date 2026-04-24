import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "../api/resources_extra";
import { useAuthStore } from "../store/stores";

export const useAllUsers = (params?: { search?: string; role?: string; page?: number }) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["admin-users", params?.search, params?.role, params?.page],
    queryFn: () => adminUsersApi.getAll(params),
    enabled: !!token && hydrated,
    retry: 2,
  });
};

export const useUserGovernanceMutations = () => {
  const queryClient = useQueryClient();

  const restrictMutation = useMutation({
    mutationFn: ({ id, days, reason }: { id: string; days: number; reason?: string }) =>
      adminUsersApi.restrict(id, days, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const blockPagesMutation = useMutation({
    mutationFn: ({ id, pages }: { id: string; pages: string[] }) =>
      adminUsersApi.updateBlockedPages(id, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return { restrictMutation, restoreMutation, blockPagesMutation };
};
