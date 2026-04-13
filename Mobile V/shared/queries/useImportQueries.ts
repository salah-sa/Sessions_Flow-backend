import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importApi } from "../api/resources";

export const useImportMutations = () => {
  const queryClient = useQueryClient();

  const testConnectionMutation = useMutation({
    mutationFn: ({ email, password }: any) => importApi.testConnection(email, password),
  });

  const previewImportMutation = useMutation({
    mutationFn: ({ email, password }: any) => importApi.preview(email, password),
  });

  const executeImportMutation = useMutation({
    mutationFn: ({ email, password }: any) => importApi.execute(email, password),
    onSuccess: () => {
      // Invalidate everything groups/students related after a bulk import
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    testConnectionMutation,
    previewImportMutation,
    executeImportMutation,
  };
};
