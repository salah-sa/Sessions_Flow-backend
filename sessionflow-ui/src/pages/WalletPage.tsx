import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { walletApi } from "../api/walletApi";
import { useAuthStore } from "../store/stores";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Zap,
  Eye, EyeOff, X, RefreshCw, Plus, AlertTriangle, Check
} from "lucide-react";

// ─── OTP Input ───────────────────────────────────────────────────────────────
const OtpInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const arr = digits.slice(); arr[i] = v;
    onChange(arr.join("").trimEnd());
    if (v && i < 5) refs[i + 1].current?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ""} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-10 h-12 text-center text-lg font-bold bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--ui-accent)]/50 focus:ring-1 focus:ring-[var(--ui-accent)]/20"
        />
      ))}
    </div>
  );
};

// ─── Verify Phone Gate ────────────────────────────────────────────────────────
const VerifyPhoneGate = ({ phone, onVerified }: { phone: string; onVerified: () => void }) => {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  const sendMutation = useMutation({
    mutationFn: () => walletApi.sendOtp({ phone, purpose: "verify_phone" }),
    onSuccess: (res) => {
      setSent(true); setCountdown(300);
      toast.success(res.message || "Verification email sent!");
      if (res.devCode) console.log("OTP Code:", res.devCode);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send code"),
  });

  const verifyMutation = useMutation({
    mutationFn: () => walletApi.verifyPhone({ phone, code }),
    onSuccess: () => { toast.success("Phone verified!"); qc.invalidateQueries({ queryKey: ["wallet-me"] }); onVerified(); },
    onError: (e: any) => toast.error(e?.message ?? "Invalid code"),
  });

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-xl">Verify Your Phone</h2>
          <p className="text-slate-500 text-sm mt-1">🇪🇬 {phone}</p>
          <p className="text-slate-600 text-xs mt-2">Required to activate wallet transfers</p>
        </div>
        {!sent ? (
          <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}
            className="w-full py-3 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm disabled:opacity-50">
            {sendMutation.isPending ? "Sending…" : "Send Verification Code"}
          </button>
        ) : (
          <div className="space-y-4">
            <OtpInput value={code} onChange={setCode} />
            {countdown > 0 && <p className="text-slate-500 text-xs">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")} remaining</p>}
            <button onClick={() => verifyMutation.mutate()} disabled={code.length < 6 || verifyMutation.isPending}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-40">
              {verifyMutation.isPending ? "Verifying…" : "Verify Code"}
            </button>
            {countdown === 0 && (
              <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}
                className="text-[var(--ui-accent)] text-xs font-bold hover:underline">Resend Code</button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Forgot PIN Modal ────────────────────────────────────────────────────────
const ForgotPinModal = ({ onClose, phone }: { onClose: () => void; phone: string }) => {
  const [step, setStep] = useState<"send" | "verify" | "done">("send");
  const [code, setCode] = useState(""); const [newPin, setNewPin] = useState(""); const [confirm, setConfirm] = useState("");
  const qc = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => walletApi.forgotPinSendOtp(),
    onSuccess: (res) => { 
      setStep("verify"); 
      toast.success(res.message || "Verification email sent!"); 
      if (res.devCode) console.log("OTP Code:", res.devCode);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const resetMutation = useMutation({
    mutationFn: () => walletApi.forgotPinReset({ phone: "", code, newPin }),
    onSuccess: () => { setStep("done"); qc.invalidateQueries({ queryKey: ["wallet-me"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reset PIN"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">Reset PIN</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        {step === "send" && (
          <>
            <p className="text-slate-400 text-sm">We'll send a verification code to your wallet's registered phone number.</p>
            <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}
              className="w-full py-3 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm disabled:opacity-50">
              {sendMutation.isPending ? "Sending…" : "Send Code"}
            </button>
          </>
        )}
        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center">Enter the 6-digit code sent to your email</p>
            <OtpInput value={code} onChange={setCode} />
            <input type="password" placeholder="New PIN (4 or 6 digits)" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={6}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--ui-accent)]/50" />
            <input type="password" placeholder="Confirm New PIN" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={6}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--ui-accent)]/50" />
            <button onClick={() => { if (newPin !== confirm) { toast.error("PINs don't match"); return; } resetMutation.mutate(); }}
              disabled={code.length < 6 || !newPin || newPin !== confirm || resetMutation.isPending}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-40">
              {resetMutation.isPending ? "Resetting…" : "Reset PIN"}
            </button>
          </div>
        )}
        {step === "done" && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-bold">PIN Reset Successfully!</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm">Close</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Transfer Modal ───────────────────────────────────────────────────────────
const TransferModal = ({ onClose, balance, phone }: { onClose: () => void; balance: number; phone: string }) => {
  const qc = useQueryClient();
  const [toPhone, setToPhone] = useState(""); const [amount, setAmount] = useState(""); const [pin, setPin] = useState(""); const [note, setNote] = useState(""); const [showForgotPin, setShowForgotPin] = useState(false);
  const fee = Math.ceil((parseFloat(amount) || 0) * 100) / 100 * 0.01;
  const total = (parseFloat(amount) || 0) + fee;

  const mutation = useMutation({
    mutationFn: () => walletApi.transfer({ toPhone, amountEGP: parseFloat(amount), pin, note, idempotencyKey: crypto.randomUUID() }),
    onSuccess: (d) => { toast.success(`Sent! Ref: ${d.referenceCode}`); qc.invalidateQueries({ queryKey: ["wallet-me"] }); qc.invalidateQueries({ queryKey: ["wallet-txns"] }); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Transfer failed"),
  });

  if (showForgotPin) return <ForgotPinModal onClose={() => setShowForgotPin(false)} phone={phone} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">Send Money</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        {[
          { ph: "Recipient phone (01XXXXXXXXX)", val: toPhone, set: setToPhone, type: "tel" },
          { ph: "Amount (EGP)", val: amount, set: setAmount, type: "number" },
          { ph: "PIN", val: pin, set: setPin, type: "password" },
          { ph: "Note (optional)", val: note, set: setNote, type: "text" },
        ].map(({ ph, val, set, type }) => (
          <input key={ph} type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--ui-accent)]/50 text-sm" />
        ))}
        {parseFloat(amount) > 0 && (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400"><span>Amount</span><span>{parseFloat(amount).toFixed(2)} EGP</span></div>
            <div className="flex justify-between text-slate-500"><span>Fee (1%)</span><span>{fee.toFixed(2)} EGP</span></div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between text-white font-bold"><span>Total deducted</span><span className={total > balance ? "text-rose-400" : ""}>{total.toFixed(2)} EGP</span></div>
          </div>
        )}
        {total > balance && <p className="text-rose-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Insufficient balance</p>}
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !toPhone || !amount || !pin || total > balance}
          className="w-full py-3 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm disabled:opacity-40">
          {mutation.isPending ? "Sending…" : "Send"}
        </button>
        <button onClick={() => setShowForgotPin(true)} className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors">Forgot PIN?</button>
      </motion.div>
    </div>
  );
};

// ─── Create Wallet ────────────────────────────────────────────────────────────
const CreateWalletForm = () => {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(""); const [pin, setPin] = useState(""); const [confirm, setConfirm] = useState("");
  const [otpStep, setOtpStep] = useState(false); const [code, setCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!(window as any).recaptchaVerifierCreate) {
      (window as any).recaptchaVerifierCreate = new RecaptchaVerifier(auth, 'recaptcha-container-create', {
        'size': 'invisible',
      });
    }
  }, []);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const formattedPhone = phone.startsWith("0") ? `+20${phone.substring(1)}` : phone;
      const appVerifier = (window as any).recaptchaVerifierCreate;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
    },
    onSuccess: () => { setOtpStep(true); toast.success("OTP sent!"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send OTP"),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!confirmationResult) throw new Error("No confirmation result");
      const result = await confirmationResult.confirm(code);
      const token = await result.user.getIdToken();
      await walletApi.verifyPhone({ phone, code: token });
      return walletApi.create({ phoneNumber: phone, pin });
    },
    onSuccess: () => { toast.success("Wallet created and verified!"); qc.invalidateQueries({ queryKey: ["wallet-me"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div id="recaptcha-container-create"></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-[var(--ui-accent)]" />
          </div>
          <h2 className="text-white font-bold text-xl">Create Your Wallet</h2>
          <p className="text-slate-500 text-sm mt-1">Secure Egyptian mobile wallet</p>
        </div>
        {!otpStep ? (
          <>
            {[{ ph: "Phone (01XXXXXXXXX)", val: phone, set: setPhone, type: "tel" }, { ph: "PIN (4 or 6 digits)", val: pin, set: setPin, type: "password" }, { ph: "Confirm PIN", val: confirm, set: setConfirm, type: "password" }]
              .map(({ ph, val, set, type }) => (
                <input key={ph} type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--ui-accent)]/50 text-sm" />
              ))}
            <button onClick={() => { if (pin !== confirm) { toast.error("PINs don't match"); return; } sendMutation.mutate(); }}
              disabled={!phone || !pin || pin !== confirm || sendMutation.isPending}
              className="w-full py-3 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm disabled:opacity-40">
              {sendMutation.isPending ? "Sending OTP…" : "Send Verification Code"}
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm text-center">Enter the 6-digit code sent to 🇪🇬 {phone}</p>
            <OtpInput value={code} onChange={setCode} />
            <button onClick={() => createMutation.mutate()} disabled={code.length < 6 || createMutation.isPending}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-40">
              {createMutation.isPending ? "Creating…" : "Verify & Create Wallet"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export function WalletPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const walletQuery = useQuery({ queryKey: ["wallet-me"], queryFn: walletApi.getMe, retry: 1 });
  const txQuery = useQuery({ queryKey: ["wallet-txns"], queryFn: () => walletApi.getTransactions(1, 30), enabled: !!walletQuery.data });

  const wallet = walletQuery.data;

  if (walletQuery.isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
    </div>
  );

  if (!wallet) return <CreateWalletForm />;

  if (!wallet.isPhoneVerified) return (
    <VerifyPhoneGate phone={wallet.phoneNumber} onVerified={() => walletQuery.refetch()} />
  );

  const dailyUsedPct = wallet.dailyLimitEGP > 0 ? (wallet.dailyUsedEGP / wallet.dailyLimitEGP) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} balance={wallet.balanceEGP} phone={wallet.phoneNumber} />}

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[var(--ui-accent)]/20 to-purple-900/20 border border-[var(--ui-accent)]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[var(--ui-accent)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Balance</span>
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-bold">Verified</span>
              </div>
            </div>
            <button onClick={() => setShowBalance(b => !b)} className="text-slate-500 hover:text-white transition-colors">
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-4xl font-black text-white tracking-tight mt-3">
            {showBalance ? `${(wallet.balanceEGP ?? 0).toLocaleString("en-EG", { minimumFractionDigits: 2 })}` : "••••••"}
            <span className="text-lg text-slate-400 ms-2">EGP</span>
          </p>
          <p className="text-slate-500 text-xs mt-1">🇪🇬 {wallet.phoneNumber}</p>

          {/* Daily Limit */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Daily limit used</span>
              <span>{(wallet.dailyUsedEGP ?? 0).toFixed(2)} / {(wallet.dailyLimitEGP ?? 0).toFixed(2)} EGP</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(dailyUsedPct, 100)}%` }} transition={{ duration: 0.8 }}
                className={cn("h-full rounded-full", dailyUsedPct > 80 ? "bg-rose-500" : "bg-[var(--ui-accent)]")} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowTransfer(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm hover:opacity-90 transition-all">
              <ArrowUpRight className="w-4 h-4" /> Send
            </button>
            <button onClick={() => navigate("/wallet/charge")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/15 transition-all">
              <Plus className="w-4 h-4" /> Charge
            </button>
            <button onClick={() => walletQuery.refetch()}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Transactions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Recent Transactions</p>
        {txQuery.isLoading ? (
          <div className="text-slate-600 text-sm text-center py-8">Loading…</div>
        ) : !txQuery.data?.items?.length ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
            <Zap className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txQuery.data.items.map(tx => (
              <motion.div key={tx.referenceCode} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                  tx.direction === "Received" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20")}>
                  {tx.direction === "Received"
                    ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                    : <ArrowUpRight className="w-5 h-5 text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{tx.counterpartyPhone}</p>
                  <p className="text-slate-500 text-xs">{tx.note ?? tx.type} · {new Date(tx.createdAt).toLocaleDateString("en-EG")}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold text-sm", tx.direction === "Received" ? "text-emerald-400" : "text-rose-400")}>
                    {tx.direction === "Received" ? "+" : "-"}{(tx.amountEGP ?? 0).toFixed(2)} EGP
                  </p>
                  {tx.feeEGP && tx.feeEGP > 0 && (
                    <p className="text-slate-600 text-[10px]">fee {tx.feeEGP.toFixed(2)} EGP</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
