import { fetchWithAuth } from "./client";
import {
  Wallet, WalletTransaction, CreateWalletRequest, TransferRequest, AdminTopUpRequest,
  SendOtpRequest, VerifyPhoneRequest, ForgotPinResetRequest,
  CreateDepositRequest, AdminApproveDepositRequest, AdminRejectDepositRequest, DepositRequest
} from "../types";

export const walletApi = {
  // ── Wallet CRUD ─────────────────────────────────────────────────────────
  getMe: () => fetchWithAuth<Wallet>("/wallet/me"),

  create: (data: CreateWalletRequest) =>
    fetchWithAuth<{ walletId: string; message: string }>("/wallet/create", {
      method: "POST", body: JSON.stringify(data),
    }),

  verifyPin: (pin: string) =>
    fetchWithAuth<{ valid: boolean; attemptsRemaining?: number; lockedUntil?: string }>("/wallet/verify-pin", {
      method: "POST", body: JSON.stringify({ pin }),
    }),

  getTransactions: (page = 1, pageSize = 20) =>
    fetchWithAuth<{ items: WalletTransaction[]; total: number; page: number; pageSize: number }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    ),

  // ── OTP / Phone Verification ─────────────────────────────────────────────
  sendOtp: (data: SendOtpRequest) =>
    fetchWithAuth<{ message: string }>("/wallet/send-otp", {
      method: "POST", body: JSON.stringify(data),
    }),

  verifyPhone: (data: VerifyPhoneRequest) =>
    fetchWithAuth<{ message: string }>("/wallet/verify-phone", {
      method: "POST", body: JSON.stringify(data),
    }),

  // ── Forgot PIN ───────────────────────────────────────────────────────────
  forgotPinSendOtp: () =>
    fetchWithAuth<{ message: string }>("/wallet/forgot-pin/send-otp", {
      method: "POST", body: JSON.stringify({}),
    }),

  forgotPinReset: (data: ForgotPinResetRequest) =>
    fetchWithAuth<{ message: string }>("/wallet/forgot-pin/reset", {
      method: "POST", body: JSON.stringify(data),
    }),

  // ── Transfer ─────────────────────────────────────────────────────────────
  transfer: (data: TransferRequest) =>
    fetchWithAuth<{ referenceCode: string; amountEGP: number; feeEGP: number; toPhone: string; newBalanceEGP: number; completedAt: string }>(
      "/wallet/transfer", { method: "POST", body: JSON.stringify(data) }
    ),

  // ── Deposit / Charge ─────────────────────────────────────────────────────
  createDepositRequest: (data: CreateDepositRequest) =>
    fetchWithAuth<{ message: string; depositId: string }>("/wallet/deposit/request", {
      method: "POST", body: JSON.stringify(data),
    }),

  getMyDepositRequests: () =>
    fetchWithAuth<DepositRequest[]>("/wallet/deposit/my-requests"),

  // ── Admin ────────────────────────────────────────────────────────────────
  adminTopUp: (data: AdminTopUpRequest) =>
    fetchWithAuth<{ message: string; reference: string }>("/wallet/admin/topup", {
      method: "POST", body: JSON.stringify(data),
    }),

  adminGetAll: (page = 1, pageSize = 50) =>
    fetchWithAuth<{
      items: Array<{ walletId: string; phoneNumber: string; balanceEGP: number; isActive: boolean; isPhoneVerified: boolean; createdAt: string }>;
      total: number; page: number; pageSize: number;
    }>(`/wallet/admin/all?page=${page}&pageSize=${pageSize}`),

  adminGetPendingDeposits: () =>
    fetchWithAuth<DepositRequest[]>("/wallet/admin/deposit/pending"),

  adminApproveDeposit: (data: AdminApproveDepositRequest) =>
    fetchWithAuth<{ message: string; reference: string }>("/wallet/admin/deposit/approve", {
      method: "POST", body: JSON.stringify(data),
    }),

  adminRejectDeposit: (data: AdminRejectDepositRequest) =>
    fetchWithAuth<{ message: string }>("/wallet/admin/deposit/reject", {
      method: "POST", body: JSON.stringify(data),
    }),
};
