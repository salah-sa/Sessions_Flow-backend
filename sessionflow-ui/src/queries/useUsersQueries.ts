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
    onMutate: async ({ id, days }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      
      const previousUsers = queryClient.getQueriesData({ queryKey: ["admin-users"] });
      
      queryClient.setQueriesData({ queryKey: ["admin-users"] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((user: any) => 
            user.id === id 
              ? { 
                  ...user, 
                  status: days === -1 ? "Banned" : "Restricted", 
                  restrictedUntil: days === -1 ? null : new Date(Date.now() + days * 86400000).toISOString() 
                }
              : user
          )
        };
      });
      return { previousUsers };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.restore(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      
      const previousUsers = queryClient.getQueriesData({ queryKey: ["admin-users"] });
      
      queryClient.setQueriesData({ queryKey: ["admin-users"] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((user: any) => 
            user.id === id 
              ? { ...user, status: "Active", restrictedUntil: null, restrictionReason: null }
              : user
          )
        };
      });
      return { previousUsers };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const blockPagesMutation = useMutation({
    mutationFn: ({ id, pages }: { id: string; pages: string[] }) =>
      adminUsersApi.updateBlockedPages(id, pages),
    onMutate: async ({ id, pages }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      
      const previousUsers = queryClient.getQueriesData({ queryKey: ["admin-users"] });
      
      queryClient.setQueriesData({ queryKey: ["admin-users"] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((user: any) => 
            user.id === id 
              ? { ...user, blockedPages: pages }
              : user
          )
        };
      });
      return { previousUsers };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return { restrictMutation, restoreMutation, blockPagesMutation };
};

