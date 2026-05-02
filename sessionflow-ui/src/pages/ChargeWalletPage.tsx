import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { walletApi } from "../api/walletApi";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, CheckCircle, Clock, XCircle,
  Sparkles, Info, ChevronRight, Wallet
} from "lucide-react";
import { cn } from "../lib/utils";

// ─── Brand SVG Logos ──────────────────────────────────────────────────────────

const WePayLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="80" height="80" rx="16" fill="url(#wePay_grad)"/>
    <rect x="0" y="54" width="80" height="26" rx="0" fill="#0050C8" opacity="0.4"/>
    <text x="7" y="49" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="36" fill="white" letterSpacing="-1">WE</text>
    <text x="9" y="71" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="17" fill="#7EC8FF" letterSpacing="1.5">Pay</text>
    <circle cx="66" cy="16" r="3.5" fill="#7EC8FF" opacity="0.9"/>
    <circle cx="56" cy="16" r="3.5" fill="#7EC8FF" opacity="0.55"/>
    <circle cx="46" cy="16" r="3.5" fill="#7EC8FF" opacity="0.25"/>
    <defs>
      <linearGradient id="wePay_grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0055D4"/>
        <stop offset="100%" stopColor="#001A6E"/>
      </linearGradient>
    </defs>
  </svg>
);

const VodafoneCashLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="80" height="80" rx="16" fill="url(#vf_grad)"/>
    <path
      d="M40 10C26.2 10 15 21.2 15 35c0 8.1 3.9 15.3 10 19.8V68l12-7c.95.1 1.95.15 3 .15C54.8 61.15 65 49.95 65 35S54.8 10 40 10z"
      fill="white" opacity="0.12"
    />
    <path
      d="M40 15C29 15 20 24 20 35c0 6.6 3.2 12.4 8.2 16V60l9.5-5.5c.75.08 1.5.12 2.3.12C51 54.62 60 45.6 60 35S51 15 40 15z"
      fill="white" opacity="0.88"
    />
    <circle cx="40" cy="35" r="11" fill="#E60000"/>
    <text x="40" y="74" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13" fill="white" textAnchor="middle" letterSpacing="1">CASH</text>
    <defs>
      <linearGradient id="vf_grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1A1A"/>
        <stop offset="100%" stopColor="#8B0000"/>
      </linearGradient>
    </defs>
  </svg>
);

// ─── Payment Method Card ──────────────────────────────────────────────────────

const PaymentCard = ({
  label, phone, isSelected, onSelect,
  gradient, textColor, bgAccent, LogoComponent, ringColor
}: {
  label: string; phone: string; isSelected: boolean;
  onSelect: () => void; gradient: string; textColor: string;
  bgAccent: string; LogoComponent: React.FC; ringColor: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopied(true);
    toast.success("Number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden",
        isSelected
          ? `border-transparent ring-2 ring-offset-2 ring-offset-[#0a0a0f] ${ringColor}`
          : "border-white/10 hover:border-white/20"
      )}
    >
      <div className={cn("absolute inset-0", gradient)} />
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      )}
      <div className="relative z-10 p-4 sm:p-5">
        {/* Logo + Name row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shadow-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/10">
            <LogoComponent />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-base sm:text-lg tracking-wide leading-tight truncate", textColor)}>{label}</p>
            <p className="text-white/50 text-xs mt-0.5">Egyptian Mobile Wallet</p>
            <div className={cn("inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", bgAccent)}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Active
            </div>
          </div>
          {isSelected && (
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", bgAccent)}>
              <CheckCircle className={cn("w-4 h-4", textColor)} />
            </div>
          )}
        </div>

        {/* Phone number — never overflows */}
        <div className="bg-black/40 rounded-xl px-3 py-3 flex items-center justify-between gap-2 border border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5 font-bold">Send money to</p>
            <p className="text-white font-mono font-black text-base sm:text-lg tracking-[0.1em] truncate">{phone}</p>
          </div>
          <button
            onClick={handleCopy}
            aria-label="Copy number"
            className={cn(
              "w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center transition-all flex-shrink-0",
              bgAccent, "hover:brightness-125 active:scale-95"
            )}
          >
            {copied ? <CheckCircle className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Status Pill ─────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    Pending:  { label: "Pending",  cls: "bg-amber-500/10 border-amber-500/20 text-amber-400",   icon: <Clock className="w-3 h-3 flex-shrink-0" /> },
    Approved: { label: "Approved", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircle className="w-3 h-3 flex-shrink-0" /> },
    Rejected: { label: "Rejected", cls: "bg-rose-500/10 border-rose-500/20 text-rose-400", icon: <XCircle className="w-3 h-3 flex-shrink-0" /> },
  };
  const s = map[status] ?? map.Pending;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", s.cls)}>
      {s.icon}{s.label}
    </span>
  );
};

// ─── Step Label ───────────────────────────────────────────────────────────────

const StepLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-500 mb-3">
    {children}
  </p>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ChargeWalletPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<"WePay" | "VodafoneCash">("WePay");
  const [amount, setAmount] = useState("");

  const { data: wallet } = useQuery({ queryKey: ["wallet-me"], queryFn: walletApi.getMe });
  const { data: myRequests, isLoading: reqLoading } = useQuery({
    queryKey: ["my-deposits"], queryFn: walletApi.getMyDepositRequests
  });

  const isFirstDeposit = !myRequests?.some(r => r.status === "Approved");
  const numAmount = parseFloat(amount) || 0;
  const bonusAmount = isFirstDeposit && numAmount > 0 ? numAmount * 0.20 : 0;

  const depositMutation = useMutation({
    mutationFn: walletApi.createDepositRequest,
    onSuccess: () => {
      toast.success("Deposit request submitted! Admin will confirm shortly.");
      queryClient.invalidateQueries({ queryKey: ["my-deposits"] });
      setAmount("");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to submit deposit request."),
  });

  const handleSubmit = () => {
    if (!amount || numAmount < 1) {
      toast.error("Minimum deposit is 1 EGP.");
      return;
    }
    depositMutation.mutate({ amountEGP: numAmount, paymentMethod: selectedMethod });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-white">

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5
                      px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Back button — 44px minimum touch target */}
          <button
            onClick={() => navigate("/wallet")}
            aria-label="Go back to wallet"
            className="w-11 h-11 min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                       flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Charge Wallet</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">1 EGP in app = 1 EGP real money</p>
          </div>

          {/* Balance badge — shrinks gracefully */}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20
                          rounded-xl px-2.5 py-1.5 flex-shrink-0">
            <Wallet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 font-bold text-xs sm:text-sm whitespace-nowrap">
              {(wallet?.balanceEGP ?? 0).toFixed(2)} EGP
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-safe">

        {/* First Charge Bonus Banner */}
        {isFirstDeposit && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-amber-500/30
                       bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_60%)]" />
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/30
                              flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-amber-400 tracking-wide text-xs sm:text-sm uppercase">🎉 First Charge Bonus!</p>
                <p className="text-white/80 text-sm mt-1">
                  Get <span className="font-bold text-amber-300">20% extra</span> on your first deposit!
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Send 100 EGP → Get <span className="text-amber-400 font-bold">120 EGP</span> credited
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1 — Choose Method */}
        <div>
          <StepLabel>Step 1 — Choose Payment Method</StepLabel>
          {/* Stack on mobile, side-by-side from sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <PaymentCard
              label="WE Pay"
              phone="01558647376"
              isSelected={selectedMethod === "WePay"}
              onSelect={() => setSelectedMethod("WePay")}
              gradient="bg-gradient-to-br from-blue-900/60 to-[#001f5b]/90"
              textColor="text-blue-300"
              bgAccent="bg-blue-600/20 text-blue-300"
              ringColor="ring-blue-500"
              LogoComponent={WePayLogo}
            />
            <PaymentCard
              label="Vodafone Cash"
              phone="01020933560"
              isSelected={selectedMethod === "VodafoneCash"}
              onSelect={() => setSelectedMethod("VodafoneCash")}
              gradient="bg-gradient-to-br from-red-900/60 to-[#5a0000]/90"
              textColor="text-red-300"
              bgAccent="bg-red-600/20 text-red-300"
              ringColor="ring-red-500"
              LogoComponent={VodafoneCashLogo}
            />
          </div>
        </div>

        {/* Step 2 — Instructions */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          <StepLabel>Step 2 — How it works</StepLabel>
          <div className="space-y-3">
            {[
              `Send your amount to the ${selectedMethod === "WePay" ? "WE Pay" : "Vodafone Cash"} number above`,
              "Enter the exact amount you sent below",
              "Submit your request and contact admin via app chat",
              "Admin verifies payment and credits your wallet",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 min-w-[24px] rounded-full bg-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/30
                                flex items-center justify-center text-[10px] font-black text-[var(--ui-accent)]">
                  {i + 1}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-400/80 text-xs leading-relaxed">
              Note your name or phone number in the transfer description so the admin can identify your payment.
            </p>
          </div>
        </div>

        {/* Step 3 — Amount */}
        <div>
          <StepLabel>Step 3 — Enter Amount Sent</StepLabel>
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Amount input with floating EGP label */}
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/30 border border-white/10 rounded-xl
                           px-4 py-4 pr-16 sm:pr-20
                           text-xl sm:text-2xl font-bold text-white placeholder-slate-700
                           focus:outline-none focus:border-[var(--ui-accent)]/50
                           focus:ring-1 focus:ring-[var(--ui-accent)]/20 transition-all"
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm sm:text-base pointer-events-none">
                EGP
              </span>
            </div>

            {/* Fee Breakdown */}
            {numAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-white/[0.02] rounded-xl p-3 sm:p-4 space-y-2 text-sm"
              >
                <div className="flex justify-between text-slate-400">
                  <span>You send</span>
                  <span className="font-mono">{numAmount.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>= In app balance</span>
                  <span className="font-mono">{numAmount.toFixed(2)} EGP</span>
                </div>
                {bonusAmount > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span className="flex-1 min-w-0 truncate me-2">🎁 First charge bonus (+20%)</span>
                    <span className="font-mono flex-shrink-0">+{bonusAmount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div className="h-px bg-white/5" />
                <div className="flex justify-between font-bold text-white">
                  <span>Total you'll receive</span>
                  <span className="font-mono">{(numAmount + bonusAmount).toFixed(2)} EGP</span>
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={depositMutation.isPending || !amount || numAmount < 1}
              className={cn(
                "w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-sm transition-all duration-300",
                "bg-gradient-to-r from-[var(--ui-accent)] to-[var(--ui-accent)]/80",
                "hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-[1.02]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
                "active:scale-[0.98]"
              )}
            >
              {depositMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Submit Deposit Request <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Request History */}
        <div>
          <StepLabel>My Deposit Requests</StepLabel>
          {reqLoading ? (
            <div className="text-slate-600 text-sm text-center py-8">Loading…</div>
          ) : !myRequests?.length ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-slate-600 text-sm">No deposit requests yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myRequests.map(req => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 sm:p-4"
                >
                  {/* Top row: logo + amount + status */}
                  <div className="flex items-center gap-3">
                    {/* Method icon — use SVG inline instead of broken img */}
                    <div className={cn(
                      "w-10 h-10 min-w-[40px] rounded-xl overflow-hidden flex-shrink-0",
                      req.paymentMethod === "WePay"
                        ? "bg-gradient-to-br from-blue-900 to-[#001f5b]"
                        : "bg-gradient-to-br from-red-900 to-[#5a0000]"
                    )}>
                      {req.paymentMethod === "WePay" ? <WePayLogo /> : <VodafoneCashLogo />}
                    </div>

                    {/* Amount + date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-white font-bold text-sm">
                          {req.amountEGP.toFixed(2)} EGP
                        </p>
                        {req.bonusEGP > 0 && (
                          <span className="text-amber-400 text-xs font-bold whitespace-nowrap">
                            +{req.bonusEGP.toFixed(2)} bonus
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {req.paymentMethod === "WePay" ? "WE Pay" : "Vodafone Cash"} ·{" "}
                        {new Date(req.createdAt).toLocaleDateString("en-EG")}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusPill status={req.status} />
                      {req.isFirstDeposit && req.status !== "Rejected" && (
                        <span className="text-[9px] text-amber-400 font-bold whitespace-nowrap">🎁 First charge</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacer for home bar on iPhone */}
        <div className="h-4" />
      </div>
    </div>
  );
}
