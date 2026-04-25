import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/resources";
import { useAuthStore } from "../store/stores";
import { queryKeys } from "./keys";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore(state => state.updateUser);
  const setAuth = useAuthStore(state => state.setAuth);

  /**
   * Safely refresh the current user object from the server WITHOUT touching the token.
   * This prevents the logout-on-profile-update bug where `setAuth(user, "")` would
   * overwrite a valid JWT with an empty string (because the token lives in Zustand
   * persist storage, not in `localStorage.sf_token`).
   */
  const refreshUserSafely = async (context: string) => {
    try {
      const freshUser = await authApi.getMe();
      if (freshUser) {
        // Use updateUser() — NOT setAuth() — to preserve the existing token
        updateUser(freshUser);
        console.info(`[${context}] User profile refreshed successfully.`);
      }
    } catch (e) {
      // Swallow the error — a failed refresh after a successful mutation
      // should NOT cascade into a logout or error state
      console.error(`[${context}] Failed to refresh user (non-fatal):`, e);
    }
  };

  const updatePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: any) => 
      authApi.updatePassword(oldPassword, newPassword),
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (base64: string) => authApi.updateAvatar(base64),
    onSuccess: async () => {
      await refreshUserSafely("Avatar");
      // Invalidate caches that display avatars
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateDisplayNameMutation = useMutation({
    mutationFn: (displayName: string) => authApi.updateDisplayName(displayName),
    onSuccess: () => refreshUserSafely("DisplayName"),
  });

  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: () => refreshUserSafely("EmailChange"),
  });

  const linkSocialMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: string; id: string }) => 
      authApi.linkSocial(provider, id),
    onSuccess: () => refreshUserSafely("LinkSocial"),
  });

  const loginSocialMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: string; id: string }) => 
      authApi.loginSocial(provider, id),
    onSuccess: (data: AuthResponse) => {
      // Login mutations are the ONLY place we call setAuth with a new token
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
