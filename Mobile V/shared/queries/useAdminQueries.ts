import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi, engineersApi, groupsApi } from "../api/resources";
import { queryKeys } from "./keys";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Administrative Queries
 * Phase 2 - Admin Console Integration
 * ═══════════════════════════════════════════════════════════
 */

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
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.pending });
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.all });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => engineersApi.deny(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.pending });
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: () => engineersApi.generateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.codes });
    },
  });

  const revokeCodeMutation = useMutation({
    mutationFn: (id: string) => engineersApi.revokeCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.codes });
    },
  });

  return {
    approveMutation,
    denyMutation,
    generateCodeMutation,
    revokeCodeMutation
  };
};

export const useSystemQueries = () => {
  const pendingEngineers = usePendingEngineers();
  const engineerCodes = useEngineerCodes();
  const auditLogs = useAuditLogs();
  const allEngineers = useAllEngineers();
  
  return {
    pendingEngineers,
    engineerCodes,
    auditLogs,
    allEngineers
  };
};

export const usePurgeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groupsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries(); 
    },
  });
};
