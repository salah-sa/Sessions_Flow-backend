import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";

export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      return fetchWithAuth<any>("/subscription/status");
    },
    staleTime: 0,                // Always treat as stale — invalidation from SignalR is instant
    refetchOnWindowFocus: true,  // Refresh when user returns to tab
  });
};

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      return fetchWithAuth<any>("/subscription/plans");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — admin pricing edits should reflect quickly
  });
};

export const useCheckoutMutation = () => {
  return useMutation({
    mutationFn: async (payload: { tier: string, isAnnual: boolean, paymentMethod: string }) => {
      return fetchWithAuth<any>("/subscription/checkout", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  });
};
