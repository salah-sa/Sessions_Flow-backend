import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { walletApi } from "../api/walletApi";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, CheckCircle, Clock, XCircle,
  Sparkles, Info, ChevronRight, Wallet
} from "lucide-react";
import { cn } from "../lib/utils";

// ─── Payment Method Card ─────────────────────────────────────────────────────

const PaymentCard = ({
  id, label, phone, isSelected, onSelect,
  gradient, textColor, bgAccent, logo
}: {
  id: string; label: string; phone: string; isSelected: boolean;
  onSelect: () => void; gradient: string; textColor: string;
  bgAccent: string; logo: string;
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 overflow-hidden",
        isSelected ? `border-transparent ring-2 ring-offset-2 ring-offset-[#0a0a0f] ${bgAccent}` : "border-white/10"
      )}
    >
      <div className={cn("absolute inset-0 opacity-80", gradient)} />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <img src={logo} alt={label} className="w-12 h-12 rounded-xl shadow-lg" />
          <div>
            <p className={cn("font-bold text-sm tracking-wide", textColor)}>{label}</p>
            <p className="text-white/60 text-xs">Egyptian Mobile Wallet</p>
          </div>
          {isSelected && (
            <CheckCircle className={cn("w-5 h-5 ms-auto", textColor)} />
          )}
        </div>
        <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Send money to</p>
            <p className="text-white font-mono font-bold text-base tracking-widest">{phone}</p>
          </div>
          <button
            onClick={handleCopy}
            className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", bgAccent, "hover:scale-110")}
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
    Pending:  { label: "Pending",  cls: "bg-amber-500/10 border-amber-500/20 text-amber-400",   icon: <Clock className="w-3 h-3" /> },
    Approved: { label: "Approved", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
    Rejected: { label: "Rejected", cls: "bg-rose-500/10 border-rose-500/20 text-rose-400", icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.Pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider", s.cls)}>
      {s.icon}{s.label}
    </span>
  );
};

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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/wallet")}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Charge Wallet</h1>
            <p className="text-xs text-slate-500">1 EGP in app = 1 EGP real money</p>
          </div>
          <div className="ms-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm">{(wallet?.balanceEGP ?? 0).toFixed(2)} EGP</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* First Charge Bonus Banner */}
        {isFirstDeposit && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_60%)]" />
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="font-black text-amber-400 tracking-wide text-sm uppercase">🎉 First Charge Bonus!</p>
                <p className="text-white/80 text-sm mt-1">Get <span className="font-bold text-amber-300">20% extra</span> on your first deposit!</p>
                <p className="text-slate-500 text-xs mt-1">
                  Send 100 EGP → Get <span className="text-amber-400 font-bold">120 EGP</span> credited to your wallet
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1 — Choose Method */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">
            Step 1 — Choose Payment Method
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PaymentCard
              id="WePay"
              label="WE Pay"
              phone="01558647376"
              isSelected={selectedMethod === "WePay"}
              onSelect={() => setSelectedMethod("WePay")}
              gradient="bg-gradient-to-br from-blue-900/80 to-[#001f5b]/80"
              textColor="text-blue-300"
              bgAccent="bg-blue-600/20"
              logo="/wepay.png"
            />
            <PaymentCard
              id="VodafoneCash"
              label="Vodafone Cash"
              phone="01020933560"
              isSelected={selectedMethod === "VodafoneCash"}
              onSelect={() => setSelectedMethod("VodafoneCash")}
              gradient="bg-gradient-to-br from-red-900/80 to-[#5a0000]/80"
              textColor="text-red-300"
              bgAccent="bg-red-600/20"
              logo="/vodafone_cash.png"
            />
          </div>
        </div>

        {/* Step 2 — Instructions */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
            Step 2 — How it works
          </p>
          <div className="space-y-3">
            {[
              `Send your amount to the ${selectedMethod === "WePay" ? "WE Pay" : "Vodafone Cash"} number above`,
              "Enter the exact amount you sent below",
              "Submit your request and contact admin via app chat",
              "Admin verifies payment and credits your wallet",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/30 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-[var(--ui-accent)]">
                  {i + 1}
                </div>
                <p className="text-slate-400 text-sm">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-400/80 text-xs">Note your name or phone number in the transfer description so the admin can identify your payment.</p>
          </div>
        </div>

        {/* Step 3 — Amount */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">
            Step 3 — Enter Amount Sent
          </p>
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="relative">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-[var(--ui-accent)]/50 focus:ring-1 focus:ring-[var(--ui-accent)]/20 transition-all pr-20"
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">EGP</span>
            </div>

            {/* Fee Breakdown */}
            {numAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-white/[0.02] rounded-xl p-4 space-y-2 text-sm"
              >
                <div className="flex justify-between text-slate-400">
                  <span>You send</span>
                  <span>{numAmount.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>= In app balance</span>
                  <span>{numAmount.toFixed(2)} EGP</span>
                </div>
                {bonusAmount > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>🎁 First charge bonus (+20%)</span>
                    <span>+{bonusAmount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div className="h-px bg-white/5" />
                <div className="flex justify-between font-bold text-white">
                  <span>Total you'll receive</span>
                  <span>{(numAmount + bonusAmount).toFixed(2)} EGP</span>
                </div>
              </motion.div>
            )}

            <button
              onClick={handleSubmit}
              disabled={depositMutation.isPending || !amount || numAmount < 1}
              className={cn(
                "w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-300",
                "bg-gradient-to-r from-[var(--ui-accent)] to-[var(--ui-accent)]/80",
                "hover:shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.4)] hover:scale-[1.02]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              )}
            >
              {depositMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Submit Deposit Request <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Request History */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">
            My Deposit Requests
          </p>
          {reqLoading ? (
            <div className="text-slate-600 text-sm text-center py-8">Loading…</div>
          ) : !myRequests?.length ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-slate-600 text-sm">No deposit requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.paymentMethod === "WePay" ? "/wepay.png" : "/vodafone_cash.png"}
                      alt={req.paymentMethod}
                      className="w-10 h-10 rounded-xl"
                    />
                    <div>
                      <p className="text-white font-bold text-sm">
                        {req.amountEGP.toFixed(2)} EGP
                        {req.bonusEGP > 0 && <span className="text-amber-400 ms-2 text-xs">+{req.bonusEGP.toFixed(2)} bonus</span>}
                      </p>
                      <p className="text-slate-500 text-xs">{new Date(req.createdAt).toLocaleDateString("en-EG")}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={req.status} />
                    {req.isFirstDeposit && req.status !== "Rejected" && (
                      <span className="text-[9px] text-amber-400 font-bold">🎁 First charge</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
