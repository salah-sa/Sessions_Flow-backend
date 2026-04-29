import { fetchWithAuth } from "./client";
import { Wallet, WalletTransaction, CreateWalletRequest, TransferRequest, AdminTopUpRequest, PaginatedResponse } from "../types";

export const walletApi = {
  create: (data: CreateWalletRequest) =>
    fetchWithAuth<{ message: string; walletId: string }>("/wallet/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth<Wallet>("/wallet/me"),

  transfer: (data: TransferRequest) =>
    fetchWithAuth<{
      referenceCode: string;
      amountEgp: number;
      toPhone: string;
      newBalanceEgp: number;
      timestamp: string;
    }>("/wallet/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTransactions: (page: number = 1, limit: number = 20) =>
    fetchWithAuth<PaginatedResponse<WalletTransaction>>(`/wallet/transactions?page=${page}&limit=${limit}`),

  adminTopUp: (data: AdminTopUpRequest) =>
    fetchWithAuth<{
      message: string;
      referenceCode: string;
      newBalanceEgp: number;
    }>("/wallet/admin/topup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
