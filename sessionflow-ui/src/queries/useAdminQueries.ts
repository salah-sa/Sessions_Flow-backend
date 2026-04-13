import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi, engineersApi } from "../api/resources_extra";
import { groupsApi as coreGroupsApi } from "../api/resources";
import { queryKeys } from "./keys";

export const useAuditLogs = () => {
  return useQuery({
    queryKey: queryKeys.audit.logs,
    queryFn: () => auditApi.getLogs(),
  });
};

export const usePendingEngineers = () => {
  return useQuery({
    queryKey: queryKeys.engineers.pending,
    queryFn: () => engineersApi.getPending(),
  });
};

export const useEngineerCodes = () => {
  return useQuery({
    queryKey: queryKeys.engineers.codes,
    queryFn: () => engineersApi.getCodes(),
  });
};

export const useAllEngineers = () => {
  return useQuery({
    queryKey: queryKeys.engineers.all,
    queryFn: () => engineersApi.getAll(),
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
