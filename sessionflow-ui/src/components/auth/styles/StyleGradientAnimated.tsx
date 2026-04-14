import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Hash, KeyRound, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";
import RealisticPandaMascot from "../RealisticPandaMascot";

/* ─── Password strength labels + colors ─── */
const strengthConfig = [
  { label: "Weak", color: "bg-red-500", textColor: "text-red-400" },
  { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400" },
  { label: "Good", color: "bg-emerald-400", textColor: "text-emerald-400" },
  { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-300" },
];

function getStrengthIndex(s: number): number {
  if (s <= 0) return -1;
  if (s < 0.35) return 0;
  if (s < 0.6) return 1;
  if (s < 0.85) return 2;
  return 3;
}

/* ─── Field Error Component ─── */
const FieldError: React.FC<{ error?: { message?: string } }> = ({ error }) => {
  if (!error?.message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      className="text-[10px] font-semibold text-red-400 ml-1 mt-1 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {error.message}
    </motion.p>
  );
};

export const StyleGradientAnimated: React.FC<LoginStyleProps> = (props) => {
  const blobRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showForgotDialog, setShowForgotDialog] = useState(false);

  const isRegister = props.isRegister ?? false;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (blobRef.current) {
        const { clientX, clientY } = event;
        blobRef.current.animate(
          { left: `${clientX}px`, top: `${clientY}px` },
          { duration: 3000, fill: "forwards" }
        );
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isStudent = props.loginMode === "student";
  const strengthIdx = getStrengthIndex(props.passwordStrength);

  return (
    <div dir="ltr" className="absolute inset-0 bg-[#0a0f1a] overflow-hidden" style={{ direction: "ltr", textAlign: "left" }}>
      {/* ═══ Background System — Matching Shell's Ambient Nebula ═══ */}
      <div
        ref={blobRef}
        className="absolute w-[900px] h-[900px] rounded-full blur-[180px] opacity-20 mix-blend-screen pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.6) 0%, rgba(6,182,212,0.4) 35%, rgba(59,130,246,0.3) 70%, transparent 100%)",
        }}
      />
      {/* Static ambient orbs matching Shell */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] bg-emerald-600/20 blur-[140px] rounded-full animate-breathe pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[60%] bg-blue-600/15 blur-[160px] rounded-full animate-breathe pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[30%] right-[-15%] w-[40%] h-[40%] bg-cyan-400/10 blur-[120px] rounded-full animate-breathe pointer-events-none" style={{ animationDelay: "1s" }} />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat", backgroundSize: "128px 128px",
        }}
      />

      {/* ═══ Scrollable content container ═══ */}
      <div className="absolute inset-0 overflow-y-auto flex items-center justify-center py-6 px-4 min-h-full">
        <motion.div
          className="w-full max-w-[420px] relative z-10 my-auto"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Panda — sits above the card */}
          <div className="flex justify-center relative z-30 mb-[-28px]">
            <div style={{ transform: "scale(0.7)", transformOrigin: "center bottom" }}>
              <RealisticPandaMascot state={props.mascotState} passwordStrength={props.passwordStrength} />
            </div>
          </div>

          <div className="relative rounded-[24px] overflow-hidden">
            {/* Card glow border — Aero emerald accent */}
            <div className="absolute inset-0 rounded-[24px] p-[1px]"
              style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(6,182,212,0.25) 40%, rgba(255,255,255,0.03) 60%, rgba(59,130,246,0.3) 100%)" }}
            />

            <div className="relative rounded-[23px] bg-[rgba(15,23,42,0.75)] backdrop-blur-2xl px-6 py-6 pt-10"
              style={{
                boxShadow: "0 0 1px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.07), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {/* Top accent bar — Aero gradient */}
              <div className="absolute top-0 left-0 right-0 h-[2px]">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 opacity-80" />
                <div className="absolute inset-0 h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 blur-sm opacity-50" />
              </div>

              {/* ═══ Header ═══ */}
              <div className="text-center mb-4">
                <h1 className="text-[22px] font-sora font-black text-white tracking-tight leading-tight uppercase">
                  {isRegister ? "Create Account" : "Welcome Back"}
                </h1>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {isRegister ? "Sign up to get started with SessionFlow" : "Sign in to continue your session"}
                </p>
              </div>

              {/* ═══ Role Switcher — Matching TabsList ═══ */}
              <div className="relative flex p-[3px] bg-slate-950/60 rounded-xl mb-4 border border-white/[0.05]">
                <motion.div
                  className="absolute top-[3px] bottom-[3px] rounded-[11px] bg-emerald-500/15 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  animate={{
                    left: props.loginMode === "engineer" ? "3px" : "50%",
                    right: props.loginMode === "engineer" ? "50%" : "3px",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  onClick={() => props.setLoginMode("engineer")}
                  className={`relative z-10 flex-1 py-2 text-[10px] font-black rounded-lg transition-colors duration-200 uppercase tracking-widest ${
                    props.loginMode === "engineer" ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Engineer
                </button>
                <button
                  onClick={() => props.setLoginMode("student")}
                  className={`relative z-10 flex-1 py-2 text-[10px] font-black rounded-lg transition-colors duration-200 uppercase tracking-widest ${
                    props.loginMode === "student" ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Student
                </button>
              </div>

              {/* ═══ Form ═══ */}
              <form onSubmit={props.onSubmit} className="space-y-3">

                {/* Name field (register only) */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                        Full Name
                      </label>
                      <div className={`relative group rounded-xl transition-all duration-300 ${
                        focusedField === "name" ? "ring-2 ring-emerald-500/25" : ""
                      }`}>
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                        <Input
                          {...props.register("name")}
                          className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                          placeholder="Enter your full name"
                          onFocus={() => { setFocusedField("name"); props.handleFieldFocus("text"); }}
                          onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                        />
                      </div>
                      <AnimatePresence>
                        <FieldError error={(props.errors as any).name} />
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Identifier field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                    {isStudent ? "Username" : "Email"}
                  </label>
                  <div className={`relative group rounded-xl transition-all duration-300 ${
                    focusedField === "identifier" ? "ring-2 ring-emerald-500/25" : ""
                  }`}>
                    {isStudent ? (
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                    ) : (
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                    )}
                    <Input
                      {...props.register("identifier")}
                      className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                      placeholder={isStudent ? "Enter your username" : "name@example.com"}
                      onFocus={() => { setFocusedField("identifier"); props.handleFieldFocus("text"); }}
                      onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                    />
                  </div>
                  <AnimatePresence>
                    <FieldError error={(props.errors as any).identifier} />
                  </AnimatePresence>
                </div>

                {/* Password field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                    Password
                  </label>
                  <div className={`relative group rounded-xl transition-all duration-300 ${
                    focusedField === "password" ? "ring-2 ring-emerald-500/25" : ""
                  }`}>
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                    <Input
                      {...props.register("password")}
                      type={showPassword ? "text" : "password"}
                      className="w-full h-[42px] pl-10 pr-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                      placeholder="••••••••"
                      onFocus={() => { setFocusedField("password"); props.handleFieldFocus("password"); }}
                      onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                      onChange={(e) => { props.register("password").onChange(e); props.handlePasswordChange(e); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    <FieldError error={(props.errors as any).password} />
                  </AnimatePresence>

                  {/* Password Strength Meter */}
                  <AnimatePresence>
                    {props.passwordStrength > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-1 px-1"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[3px] bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${strengthIdx >= 0 ? strengthConfig[strengthIdx].color : ""}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${props.passwordStrength * 100}%` }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                          </div>
                          {strengthIdx >= 0 && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${strengthConfig[strengthIdx].textColor}`}>
                              {strengthConfig[strengthIdx].label}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm Password field (register only) */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                        Confirm Password
                      </label>
                      <div className={`relative group rounded-xl transition-all duration-300 ${
                        focusedField === "confirmPassword" ? "ring-2 ring-emerald-500/25" : ""
                      }`}>
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                        <Input
                          {...props.register("confirmPassword")}
                          type={showConfirmPassword ? "text" : "password"}
                          className="w-full h-[42px] pl-10 pr-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                          placeholder="••••••••"
                          onFocus={() => { setFocusedField("confirmPassword"); props.handleFieldFocus("password"); }}
                          onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors duration-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <AnimatePresence>
                        <FieldError error={(props.errors as any).confirmPassword} />
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ═══ Student-only fields ═══ */}
                <AnimatePresence>
                  {isRegister && isStudent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-3 overflow-hidden"
                    >
                      {/* Email Field */}
                      <div className="space-y-1 mt-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                          Email Address
                        </label>
                        <div className={`relative group rounded-xl transition-all duration-300 ${
                          focusedField === "email" ? "ring-2 ring-emerald-500/25" : ""
                        }`}>
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                          <Input
                            {...props.register("email")}
                            type="email"
                            className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                            placeholder="name@example.com"
                            onFocus={() => { setFocusedField("email"); props.handleFieldFocus("text"); }}
                            onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          />
                        </div>
                        <AnimatePresence>
                          <FieldError error={(props.errors as any).email} />
                        </AnimatePresence>
                      </div>

                      {/* Group Name Field */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                          Group Name
                        </label>
                        <div className={`relative group rounded-xl transition-all duration-300 ${
                          focusedField === "groupName" ? "ring-2 ring-emerald-500/25" : ""
                        }`}>
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                          <Input
                            {...props.register("groupName")}
                            className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                            placeholder="Exact group name (e.g. Math-101)"
                            onFocus={() => { setFocusedField("groupName"); props.handleFieldFocus("text"); }}
                            onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-1">💡 It's better to copy the exact Group Name.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ═══ Student-only fields (Login Only) ═══ */}
                <AnimatePresence>
                  {!isRegister && isStudent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-3 overflow-hidden mt-3"
                    >
                      {/* Student ID */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                          Student ID
                        </label>
                        <div className={`relative group rounded-xl transition-all duration-300 ${
                          focusedField === "studentId" ? "ring-2 ring-emerald-500/25" : ""
                        }`}>
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                          <Input
                            {...props.register("studentId")}
                            className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                            placeholder="STU-2025-XXXXX"
                            onFocus={() => { setFocusedField("studentId"); props.handleFieldFocus("text"); }}
                            onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          />
                        </div>
                      </div>

                      {/* Engineer Code */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                          Engineer Code
                        </label>
                        <div className={`relative group rounded-xl transition-all duration-300 ${
                          focusedField === "engineerCode" ? "ring-2 ring-emerald-500/25" : ""
                        }`}>
                          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors duration-300" />
                          <Input
                            {...props.register("engineerCode")}
                            className="w-full h-[42px] pl-10 bg-slate-950/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-emerald-500/30 transition-all duration-300 text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                            placeholder="Enter your engineer code"
                            onFocus={() => { setFocusedField("engineerCode"); props.handleFieldFocus("text"); }}
                            onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember + Forgot (login only) */}
                {!isRegister && (
                  <div className="flex justify-between items-center px-0.5">
                    <label className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={props.rememberMe}
                          onChange={(e) => props.setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-slate-950 border-white/10 text-emerald-500 focus:ring-emerald-500/30 transition-all cursor-pointer"
                        />
                      </div>
                      <span className="font-medium">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotDialog(true)}
                      className="text-[11px] text-slate-500 hover:text-emerald-400 transition-colors duration-200 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={props.loading}
                  className="relative w-full h-[44px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-blue-500 text-white font-black rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_24px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.4)] active:scale-[0.98] mt-1 tracking-widest text-[11px] uppercase"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {props.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isRegister ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Create Account
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </span>
                </Button>
              </form>

              {/* ═══ Social divider ═══ */}
              <div className="mt-5">
                <div className="relative flex items-center mb-4">
                  <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  <span className="flex-shrink-0 mx-4 text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
                    Or continue with
                  </span>
                  <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                </div>
                <SocialButtons mode="icon-only" layout="row" theme="dark" />
              </div>

              {/* ═══ Footer ═══ */}
              <div className="mt-4 text-center pb-1">
                <p className="text-[12px] text-slate-500">
                  {isRegister ? (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => props.onNavigate("/login")}
                        className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors duration-200"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{" "}
                      <button
                        onClick={() => props.onNavigate("/register")}
                        className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors duration-200"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Forgot Password Dialog ═══ */}
      <AnimatePresence>
        {showForgotDialog && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForgotDialog(false)}
          >
            <motion.div
              className="w-full max-w-sm mx-4 bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-center text-lg font-sora font-black text-white uppercase tracking-wider mb-2">
                  Reset Password
                </h3>
                <p className="text-center text-[11px] text-slate-500 leading-relaxed mb-5">
                  Please contact your system administrator to reset your password. They can be reached through the admin panel.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowForgotDialog(false)}
                >
                  Got It
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
