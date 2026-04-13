import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/resources";
import { useAuthStore } from "../store/stores";
import { queryKeys } from "./keys";
import { secureStorage } from "../../services/secureStorage";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore(state => state.setAuth);

  const updatePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: any) => 
      authApi.updatePassword(oldPassword, newPassword),
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (base64: string) => authApi.updateAvatar(base64),
    onSuccess: async () => {
      try {
        const freshUser = await authApi.getMe();
        if (freshUser) {
          const token = await secureStorage.getToken() || "";
          setAuth(freshUser, token);
          console.info("[Avatar] Updated successfully — stored URL from server.");
        }
      } catch (e) {
        console.error("[Avatar] Failed to refresh user after avatar update:", e);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  return {
    updatePasswordPasswordMutation: updatePasswordMutation, // Keeping original names for parity
    updateAvatarMutation
  };
};

export const useMeQuery = (options = {}) => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.getMe(),
    staleTime: 5 * 60 * 1000, 
    ...options
  });
};
