import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { Notification } from "../types";

export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications.recent,
    queryFn: () => notificationsApi.getRecent(),
  });
};

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  return {
    markAsReadMutation,
    markAllAsReadMutation,
  };
};
