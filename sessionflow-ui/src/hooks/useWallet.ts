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
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "admin"] });
    },
  });

  const verifyPinMutation = useMutation({
    mutationFn: (pin: string) => walletApi.verifyPin(pin),
  });

  return {
    walletQuery,
    createWalletMutation,
    transferMutation,
    adminTopUpMutation,
    verifyPinMutation,
  };
}

export function useWalletTransactions(page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ["wallet", "transactions", page, pageSize],
    queryFn: () => walletApi.getTransactions(page, pageSize),
  });
}

export function useAdminWallets(page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["wallet", "admin", page, pageSize],
    queryFn: () => walletApi.adminGetAll(page, pageSize),
  });
}
