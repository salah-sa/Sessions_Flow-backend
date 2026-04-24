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
