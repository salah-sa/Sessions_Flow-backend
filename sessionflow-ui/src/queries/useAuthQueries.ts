import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/resources";
import { useAuthStore } from "../store/stores";
import { queryKeys } from "./keys";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore(state => state.setAuth);
  const user = useAuthStore(state => state.user);

  const updatePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: any) => 
      authApi.updatePassword(oldPassword, newPassword),
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (base64: string) => authApi.updateAvatar(base64),
    onSuccess: async () => {
      // CRITICAL FIX: Fetch fresh user from server to get URL (NOT base64)
      // The backend now saves as file and returns a URL.
      // We MUST call /auth/me to get the clean user object with URL-only avatarUrl.
      try {
        const freshUser = await authApi.getMe();
        if (freshUser) {
          const token = localStorage.getItem("sf_token") || "";
          setAuth(freshUser, token);
          console.info("[Avatar] Updated successfully — stored URL from server, NOT base64.");
        }
      } catch (e) {
        console.error("[Avatar] Failed to refresh user after avatar update:", e);
      }
      // Invalidate caches that display avatars
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateDisplayNameMutation = useMutation({
    mutationFn: (displayName: string) => authApi.updateDisplayName(displayName),
    onSuccess: async () => {
      try {
        const freshUser = await authApi.getMe();
        if (freshUser) {
          const token = localStorage.getItem("sf_token") || "";
          setAuth(freshUser, token);
        }
      } catch (e) {
        console.error("[DisplayName] Failed to refresh user:", e);
      }
    },
  });

  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: async () => {
      try {
        const freshUser = await authApi.getMe();
        if (freshUser) {
          const token = localStorage.getItem("sf_token") || "";
          setAuth(freshUser, token);
        }
      } catch (e) {
        console.error("[EmailChange] Failed to refresh user:", e);
      }
    },
  });

  const linkSocialMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: string; id: string }) => 
      authApi.linkSocial(provider, id),
    onSuccess: async () => {
      try {
        const freshUser = await authApi.getMe();
        if (freshUser) {
          const token = localStorage.getItem("sf_token") || "";
          setAuth(freshUser, token);
        }
      } catch (e) {
        console.error("[LinkSocial] Failed to refresh user:", e);
      }
    },
  });

  const loginSocialMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: string; id: string }) => 
      authApi.loginSocial(provider, id),
    onSuccess: (data: AuthResponse) => {
      localStorage.setItem("sf_token", data.token);
      setAuth(data.user, data.token);
    },
  });

  return {
    updatePasswordMutation,
    updateAvatarMutation,
    updateDisplayNameMutation,
    requestEmailChangeMutation,
    verifyEmailChangeMutation,
    linkSocialMutation,
    loginSocialMutation,
  };
};

export const useMeQuery = (options = {}) => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};
