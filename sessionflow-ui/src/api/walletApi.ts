import { fetchWithAuth } from "./client";
import { Wallet, WalletTransaction, CreateWalletRequest, TransferRequest, AdminTopUpRequest, PaginatedResponse } from "../types";

export const walletApi = {
  create: (data: CreateWalletRequest) =>
    fetchWithAuth<{ walletId: string; phoneNumber: string; balance: number; createdAt: string }>("/wallet/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth<Wallet>("/wallet/me"),

  verifyPin: (pin: string) =>
    fetchWithAuth<{ valid: boolean; attemptsRemaining?: number; locked?: boolean; unlockAt?: string }>("/wallet/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),

  transfer: (data: TransferRequest) =>
    fetchWithAuth<{
      referenceCode: string;
      amountEGP: number;
      toPhone: string;
      newBalanceEGP: number;
      completedAt: string;
    }>("/wallet/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTransactions: (page: number = 1, pageSize: number = 20) =>
    fetchWithAuth<{ items: WalletTransaction[]; totalCount: number; page: number; pageSize: number }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    ),

  adminTopUp: (data: AdminTopUpRequest) =>
    fetchWithAuth<{
      message: string;
      referenceCode: string;
      newBalanceEgp: number;
    }>("/wallet/admin/topup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  adminGetAll: (page: number = 1, pageSize: number = 50) =>
    fetchWithAuth<{
      items: Array<{
        walletId: string;
        userId: string;
        phoneNumber: string;
        balanceEgp: number;
        dailyLimitEgp: number;
        dailyUsedEgp: number;
        isActive: boolean;
        createdAt: string;
      }>;
      totalCount: number;
      page: number;
      pageSize: number;
    }>(`/wallet/admin/all?page=${page}&pageSize=${pageSize}`),
};
