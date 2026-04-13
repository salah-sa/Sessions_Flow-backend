import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/resources";
import { queryKeys } from "./keys";

export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.getAll(),
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
