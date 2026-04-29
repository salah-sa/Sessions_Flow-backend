import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "../api/walletApi";
import { CreateWalletRequest, TransferRequest, AdminTopUpRequest } from "../types";

export function useWallet() {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: walletApi.getMe,
    retry: false, // Don't retry if they don't have a wallet
  });

  const createWalletMutation = useMutation({
    mutationFn: (data: CreateWalletRequest) => walletApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: TransferRequest) => walletApi.transfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    },
  });

  const adminTopUpMutation = useMutation({
    mutationFn: (data: AdminTopUpRequest) => walletApi.adminTopUp(data),
    onSuccess: () => {
      // Typically admin doesn't see their own balance change for topup, but we invalidate just in case
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    },
  });

  return {
    walletQuery,
    createWalletMutation,
    transferMutation,
    adminTopUpMutation,
  };
}

export function useWalletTransactions(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["wallet", "transactions", page, limit],
    queryFn: () => walletApi.getTransactions(page, limit),
  });
}
