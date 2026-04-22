import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/resources_extra";
import { queryKeys } from "./keys";

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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previousData = queryClient.getQueryData(queryKeys.notifications.recent);

      queryClient.setQueryData(queryKeys.notifications.recent, (old: any) => {
        if (!old) return old;
        const newNotifications = old.notifications.map((n: any) => 
          n.id === id ? { ...n, isRead: true } : n
        );
        const newUnreadCount = Math.max(0, old.unreadCount - 1);
        return { ...old, notifications: newNotifications, unreadCount: newUnreadCount };
      });

      return { previousData };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(queryKeys.notifications.recent, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previousData = queryClient.getQueryData(queryKeys.notifications.recent);

      queryClient.setQueryData(queryKeys.notifications.recent, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: 0,
          notifications: old.notifications.map((n: any) => ({ ...n, isRead: true }))
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKeys.notifications.recent, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  return {
    markAsReadMutation,
    markAllAsReadMutation,
  };
};
