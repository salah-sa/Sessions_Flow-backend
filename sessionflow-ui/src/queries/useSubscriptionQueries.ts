import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";

export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      return fetchWithAuth<any>("/subscription/status");
    }
  });
};

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      return fetchWithAuth<any>("/subscription/plans");
    },
    staleTime: 1000 * 60 * 60, // 1 hour - pricing doesn't change often
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
