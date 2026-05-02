import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, X, Loader2, CheckCircle, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkWalletEligibility, walletCheckout } from "../../api/newFeatures";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

interface WalletCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: "Pro" | "Ultra" | "Enterprise";
  isAnnual: boolean;
  onSuccess?: () => void;
}

export const WalletCheckoutModal: React.FC<WalletCheckoutModalProps> = ({
  isOpen,
  onClose,
  tier,
  isAnnual,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  // Check eligibility when modal opens
  const { data: eligibility, isLoading: checkLoading } = useQuery({
    queryKey: ["wallet-eligibility", tier, isAnnual],
    queryFn: () => checkWalletEligibility(tier, isAnnual),
    enabled: isOpen,
    staleTime: 0,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => walletCheckout(tier, isAnnual),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`✅ Upgraded to ${tier}!`, {
          description: `New wallet balance: ${data.newBalanceEgp?.toFixed(2)} EGP`,
          duration: 6000,
        });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] });
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error ?? "Checkout failed. Please try again.");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Checkout failed.");
    },
  });

  const TIER_COLORS: Record<string, string> = {
    Pro: "from-blue-600 to-violet-600",
    Ultra: "from-violet-600 to-pink-600",
    Enterprise: "from-amber-500 to-orange-500",
  };

  const gradient = TIER_COLORS[tier] ?? "from-blue-600 to-violet-600";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient line */}
            <div className={cn("h-0.5 w-full bg-gradient-to-r", gradient)} />

            <div className="p-7 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Pay with Wallet</h2>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {isAnnual ? "Annual" : "Monthly"} — {tier} Plan
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Balance check */}
              {checkLoading ? (
                <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Checking balance…</span>
                </div>
              ) : eligibility ? (
                <div className="space-y-3">
                  {/* Wallet error (no wallet / inactive) — show before balance grid */}
                  {!eligibility.eligible && eligibility.balanceEgp === 0 && eligibility.requiredEgp === 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] text-amber-300 font-bold">Wallet Not Ready</p>
                        <p className="text-[10px] text-amber-400/70 mt-0.5">
                          {eligibility.error ?? "Please set up and activate your wallet first."}
                        </p>
                        <button
                          onClick={() => { onClose(); navigate("/wallet"); }}
                          className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Go to Wallet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Balance display */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-2xl p-3.5 space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Your Balance</p>
                          <p className="text-xl font-black text-white">{eligibility.balanceEgp.toFixed(2)}</p>
                          <p className="text-[9px] text-slate-600 font-bold">EGP</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-2xl p-3.5 space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Required</p>
                          <p className={cn("text-xl font-black", eligibility.eligible ? "text-white" : "text-red-400")}>
                            {eligibility.requiredEgp.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-600 font-bold">EGP</p>
                        </div>
                      </div>

                      {/* Insufficient balance */}
                      {!eligibility.eligible && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 flex gap-3 items-start">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] text-red-300 font-bold">Insufficient Balance</p>
                            <p className="text-[10px] text-red-400/70 mt-0.5">
                              You need {eligibility.shortfallEgp.toFixed(2)} EGP more.
                            </p>
                            <button
                              onClick={() => { onClose(); navigate("/wallet/charge"); }}
                              className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Charge Wallet
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Eligible — confirm checkbox */}
                      {eligibility.eligible && (
                        <label className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-2xl cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                          />
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                            I confirm deducting <span className="text-white font-bold">{eligibility.requiredEgp.toFixed(2)} EGP</span> from my wallet
                          </span>
                        </label>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-800/40 rounded-2xl flex gap-3 items-start">
                  <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-400">Unable to check eligibility. Please try again.</span>
                </div>
              )}

              {/* Action */}
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={
                  checkLoading ||
                  !eligibility?.eligible ||
                  !confirmed ||
                  checkoutMutation.isPending
                }
                className={cn(
                  "w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                  "bg-gradient-to-r text-white",
                  gradient,
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "enabled:hover:opacity-90 enabled:active:scale-[0.98]"
                )}
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Confirm & Activate
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
