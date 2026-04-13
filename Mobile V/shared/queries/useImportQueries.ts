import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importApi } from "../api/resources";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — 3C School Import Queries
 * Phase 3: Settings & Administrative Import
 * ═══════════════════════════════════════════════════════════
 */

export const useImportMutations = () => {
  const queryClient = useQueryClient();

  const testConnection = useMutation({
    mutationFn: ({ email, password }: any) => importApi.testConnection(email, password),
  });

  const previewImport = useMutation({
    mutationFn: ({ email, password }: any) => importApi.preview(email, password),
  });

  const executeImport = useMutation({
    mutationFn: ({ email, password }: any) => importApi.execute(email, password),
    onSuccess: () => {
      // Refresh groups and other relevant data after import
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  return {
    testConnection,
    previewImport,
    executeImport,
  };
};
