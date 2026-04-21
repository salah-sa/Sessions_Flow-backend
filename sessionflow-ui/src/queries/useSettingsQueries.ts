import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, engineersApi, gmailApi, importApi } from "../api/resources_extra";
import { groupsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { Setting } from "../types";

export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.getAll(),
  });
};

export const useEngineerCodes = () => {
  return useQuery({
    queryKey: queryKeys.engineers.codes,
    queryFn: () => engineersApi.getCodes(),
  });
};

export const useGmailStatus = () => {
  return useQuery({
    queryKey: ["gmail", "status"],
    queryFn: () => gmailApi.getStatus(),
  });
};

export const useSettingsMutations = () => {
  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: (settings: Record<string, string>) => settingsApi.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });

  const testEmail = useMutation({
    mutationFn: (email: string) => settingsApi.testEmail(email),
  });

  return {
    updateSettings,
    testEmail
  };
};

export const useEngineerMutations = () => {
  const queryClient = useQueryClient();

  const generateCode = useMutation({
    mutationFn: () => engineersApi.generateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.codes });
    },
  });

  const revokeCode = useMutation({
    mutationFn: (id: string) => engineersApi.revokeCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.engineers.codes });
    },
  });

  return {
    generateCode,
    revokeCode
  };
};

export const useImportMutations = () => {
  const testConnection = useMutation({
    mutationFn: ({ email, password }: any) => importApi.testConnection(email, password),
  });

  const preview = useMutation({
    mutationFn: ({ email, password }: any) => importApi.preview(email, password),
  });

  const execute = useMutation({
    mutationFn: ({ email, password }: any) => importApi.execute(email, password),
  });

  return {
    testConnection,
    preview,
    execute
  };
};

export const usePurgeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groupsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};
