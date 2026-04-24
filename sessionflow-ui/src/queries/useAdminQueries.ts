import { useQuery, useMutation, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { auditApi, engineersApi } from "../api/resources_extra";
import { groupsApi as coreGroupsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

export const useAuditLogs = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.audit.logs,
    queryFn: () => auditApi.getLogs(),
    enabled: !!token && hydrated,
    retry: 2,
  });
};

export const usePendingEngineers = (options?: any): UseQueryResult<any[], Error> => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.engineers.pending,
    queryFn: () => engineersApi.getPending() as Promise<any[]>,
    enabled: !!token && hydrated,
    retry: 2,
    ...options
  }) as UseQueryResult<any[], Error>;
};

export const useEngineerCodes = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.engineers.codes,
    queryFn: () => engineersApi.getCodes(),
    enabled: !!token && hydrated,
    retry: 2,
  });
};

export const useAllEngineers = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.engineers.all,
    queryFn: () => engineersApi.getAll(),
    enabled: !!token && hydrated,
    retry: 2,
  });
};


export const useAdminMutations = () => {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => engineersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => engineersApi.deny(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: () => engineersApi.generateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
    },
  });

  const revokeCodeMutation = useMutation({
    mutationFn: (id: string) => engineersApi.revokeCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
    },
  });

  return {
    approveMutation,
    denyMutation,
    generateCodeMutation,
    revokeCodeMutation
  };
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const banMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: "Student" | "Engineer" }) => {
      return role === "Student" ? studentsApi.ban(id) : engineersApi.ban(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, role, duration }: { id: string, role: "Student" | "Engineer", duration?: number }) => {
      return role === "Student" ? studentsApi.suspend(id, duration) : engineersApi.suspend(id, duration);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: "Student" | "Engineer" }) => {
      return role === "Student" ? studentsApi.restore(id) : engineersApi.restore(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  return { banMutation, suspendMutation, restoreMutation };
};

export const useEngineerMutations = () => {
  const queryClient = useQueryClient();
  const muts = useAdminMutations();
  return {
    generateCode: muts.generateCodeMutation,
    revokeCode: muts.revokeCodeMutation,
    approveEngineer: muts.approveMutation,
    denyEngineer: muts.denyMutation
  };
};

export const usePurgeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => coreGroupsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries(); // Full purge warrants full invalidation
    },
  });
};

export const useSystemQueries = () => {
  const pendingEngineers = usePendingEngineers();
  const engineerCodes = useEngineerCodes();
  const auditLogs = useAuditLogs();
  const allEngineers = useAllEngineers();
  
  // This aggregate hook is used by AdminPage
  return {
    pendingEngineers,
    engineerCodes,
    auditLogs,
    allEngineers
  };
};
