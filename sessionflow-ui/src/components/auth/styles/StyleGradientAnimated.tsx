import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, 
  Hash, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, 
  Search, Users, ArrowRight, ArrowLeft 
} from "lucide-react";
import { Input, Button, Badge } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";
import RealisticPandaMascot from "../RealisticPandaMascot";
import { ForgotPasswordModal } from "../ForgotPasswordModal";

/* ─── Password strength labels + colors ─── */
const strengthConfig = [
  { label: "Weak", color: "bg-red-500", textColor: "text-red-400" },
  { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400" },
  { label: "Good", color: "bg-emerald-400", textColor: "text-emerald-400" },
  { label: "Strong", color: "bg-[var(--ui-accent)]", textColor: "text-[var(--ui-accent)]" },
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
    <div className="absolute inset-0 bg-[var(--ui-bg)] overflow-hidden">
      {/* ═══ Background System — Matching Shell's Ambient Nebula ═══ */}
      <div
        ref={blobRef}
        className="absolute w-[900px] h-[900px] rounded-full blur-[180px] opacity-20 mix-blend-screen pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "radial-gradient(circle, rgba(var(--ui-accent-rgb), 0.6) 0%, rgba(var(--ui-accent-rgb), 0.4) 35%, rgba(var(--ui-accent-rgb), 0.3) 70%, transparent 100%)",
        }}
      />
      {/* Static ambient orbs matching Shell */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] bg-[var(--ui-accent)]/20 blur-[140px] rounded-full animate-breathe pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[60%] bg-[var(--ui-accent)]/15 blur-[160px] rounded-full animate-breathe pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[30%] right-[-15%] w-[40%] h-[40%] bg-[var(--ui-accent)]/10 blur-[120px] rounded-full animate-breathe pointer-events-none" style={{ animationDelay: "1s" }} />

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
            {/* Card glow border */}
            <div className="absolute inset-0 rounded-[24px] p-[1px]"
              style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(6,182,212,0.25) 40%, rgba(255,255,255,0.03) 60%, rgba(59,130,246,0.3) 100%)" }}
            />

            <div className="relative rounded-[23px] bg-[var(--ui-sidebar-bg)]/75 backdrop-blur-2xl px-6 py-6 pt-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px]">
                <div className="h-full bg-gradient-to-r from-[var(--ui-accent)]/40 via-[var(--ui-accent)] to-[var(--ui-accent)]/40 opacity-80" />
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

              {/* ═══ Role Switcher ═══ */}
              <div className="relative flex p-[3px] bg-var(--ui-bg)/60 rounded-xl mb-4 border border-white/[0.05]">
                <motion.div
                  className="absolute top-[3px] bottom-[3px] rounded-[11px] bg-[var(--ui-accent)]/15 border border-[var(--ui-accent)]/25 shadow-[0_0_12px_rgba(var(--ui-accent-rgb),0.15)]"
                  animate={{
                    left: props.loginMode === "engineer" ? "3px" : "50%",
                    right: props.loginMode === "engineer" ? "50%" : "3px",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  type="button"
                  onClick={() => props.setLoginMode("engineer")}
                  className={`relative z-10 flex-1 py-2 text-[10px] font-black rounded-lg transition-colors duration-200 uppercase tracking-widest ${
                    props.loginMode === "engineer" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Engineer
                </button>
                <button
                  type="button"
                  onClick={() => props.setLoginMode("student")}
                  className={`relative z-10 flex-1 py-2 text-[10px] font-black rounded-lg transition-colors duration-200 uppercase tracking-widest ${
                    props.loginMode === "student" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Student
                </button>
              </div>

              {/* ═══ Form / Discovery Logic ═══ */}
              <div className="space-y-3">
                {isRegister && isStudent && props.discoveryStep === "search" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                        Find Your Group
                      </label>
                      <div className={`relative group rounded-xl transition-all duration-300 ${
                        focusedField === "groupName" ? "ring-2 ring-[var(--ui-accent)]/25" : ""
                      }`}>
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[var(--ui-accent)]" />
                        <Input
                          {...props.register("groupName")}
                          className="w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] focus:border-[var(--ui-accent)]/30 transition-all text-[13px] placeholder:text-slate-600 font-medium normal-case tracking-normal"
                          placeholder="Exact group name (e.g. Math-101)"
                          onFocus={() => { setFocusedField("groupName"); props.handleFieldFocus("text"); }}
                          onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 mt-2 leading-relaxed px-1">
                        <AlertCircle className="w-3 h-3 inline-block -mt-0.5 mr-1" />
                        Enter the group name provided by your engineer to verify your identity.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => props.onDiscover?.(props.watch?.("groupName") || "")}
                      disabled={props.loading}
                      className="w-full h-[44px] bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-white transition-all shadow-glow shadow-[var(--ui-accent)]/10"
                    >
                      {props.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          Search Group
                        </div>
                      )}
                    </Button>
                  </motion.div>
                )}

                {isRegister && isStudent && props.discoveryStep === "pick-student" && props.discoveredGroup && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/20 flex items-center justify-center border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/10">
                          <Users className="w-5 h-5 text-[var(--ui-accent)]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            {props.discoveredGroup.groupName}
                          </h3>
                          <p className="text-[9px] text-[var(--ui-accent)] font-bold uppercase tracking-widest mt-0.5">
                            Level {props.discoveredGroup.level} • {props.discoveredGroup.engineerName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           Who are you? <span className="text-[8px] text-slate-600 font-medium lowercase italic">(Select your name)</span>
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                          {props.discoveredGroup.students.map((student) => (
                            <button 
                              key={student.id}
                              type="button"
                              onClick={() => props.onSelectStudent?.(student)}
                              className="w-full px-4 py-2.5 bg-var(--ui-bg)/40 hover:bg-[var(--ui-accent)]/10 border border-white/5 hover:border-[var(--ui-accent)]/30 rounded-xl text-start transition-all group flex items-center justify-between"
                            >
                              <span className="text-[11px] text-slate-400 group-hover:text-white font-bold uppercase transition-colors">{student.name}</span>
                              <div className="w-5 h-5 rounded-full bg-white/5 group-hover:bg-[var(--ui-accent)] flex items-center justify-center transition-all">
                                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" onClick={props.onResetDiscovery} className="w-full text-[10px] h-10 border-white/5 bg-transparent hover:bg-white/5">
                      <ArrowLeft className="w-3 h-3 mr-2" />
                      Not my group? Search again
                    </Button>
                  </motion.div>
                )}

                {(!isRegister || !isStudent || props.discoveryStep === "register") && (
                  <form onSubmit={props.onSubmit} className="space-y-3">
                    {/* Register-only Name field */}
                    <AnimatePresence mode="wait">
                      {isRegister && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1 overflow-hidden"
                        >
                          <div className="flex items-center justify-between ml-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Full Name</label>
                            {isStudent && props.selectedStudent && (
                                <Badge variant="glow" className="text-[7px] py-0 px-1.5 opacity-80">
                                    <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                                    Identity Locked
                                </Badge>
                            )}
                          </div>
                          <div className={`relative group rounded-xl transition-all ${focusedField === "name" ? "ring-2 ring-[var(--ui-accent)]/25" : ""} ${isStudent && props.selectedStudent ? "opacity-70 pointer-events-none" : ""}`}>
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[var(--ui-accent)]" />
                            <Input
                              {...props.register("name")}
                              readOnly={!!(isStudent && props.selectedStudent)}
                              className={`w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl focus:bg-white/[0.04] text-[13px] ${isStudent && props.selectedStudent ? "cursor-not-allowed text-slate-400" : ""}`}
                              placeholder="Enter your full name"
                              onFocus={() => { setFocusedField("name"); props.handleFieldFocus("text"); }}
                              onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                            />
                            {isStudent && props.selectedStudent && (
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                            )}
                          </div>
                          <FieldError error={(props.errors as any).name} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email / Username field */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                        {isStudent ? "Username" : "Email"}
                      </label>
                      <div className={`relative group rounded-xl transition-all ${focusedField === "identifier" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                        {isStudent ? <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" /> : <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />}
                        <Input
                          {...props.register("identifier")}
                          className="w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                          placeholder={isStudent ? "Enter your username" : "username@gmail.com"}
                          onFocus={() => { setFocusedField("identifier"); props.handleFieldFocus("text"); }}
                          onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                        />
                      </div>
                      <FieldError error={(props.errors as any).identifier} />
                    </div>

                    {/* Password field */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Password</label>
                      <div className={`relative group rounded-xl transition-all ${focusedField === "password" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <Input
                          {...props.register("password")}
                          type={showPassword ? "text" : "password"}
                          className="w-full h-[42px] pl-10 pr-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                          placeholder="••••••••"
                          onFocus={() => { setFocusedField("password"); props.handleFieldFocus("password"); }}
                          onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          onChange={(e) => { props.register("password").onChange(e); props.handlePasswordChange(e); }}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <FieldError error={(props.errors as any).password} />
                      
                      {!isRegister && (
                        <div className="flex justify-end mt-1 px-1">
                          <button
                            type="button"
                            onClick={() => setShowForgotDialog(true)}
                            className="text-[10px] font-bold text-[var(--ui-accent)]/60 hover:text-[var(--ui-accent)] transition-colors uppercase tracking-widest"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}
                      
                      {/* Strength Meter */}
                      {isRegister && props.passwordStrength > 0 && (
                        <div className="pt-1 px-1 flex items-center gap-2">
                          <div className="flex-1 h-[3px] bg-var(--ui-surface) rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${strengthIdx >= 0 ? strengthConfig[strengthIdx].color : ""}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${props.passwordStrength * 100}%` }}
                            />
                          </div>
                          {strengthIdx >= 0 && <span className={`text-[9px] font-bold ${strengthConfig[strengthIdx].textColor}`}>{strengthConfig[strengthIdx].label}</span>}
                        </div>
                      )}
                    </div>

                    {/* Confirm Password field (register only) */}
                    <AnimatePresence mode="wait">
                      {isRegister && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1 overflow-hidden"
                        >
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Confirm Password</label>
                          <div className={`relative group rounded-xl transition-all ${focusedField === "confirmPassword" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <Input
                              {...props.register("confirmPassword")}
                              type={showConfirmPassword ? "text" : "password"}
                              className="w-full h-[42px] pl-10 pr-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                              placeholder="••••••••"
                              onFocus={() => { setFocusedField("confirmPassword"); props.handleFieldFocus("password"); }}
                              onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <FieldError error={(props.errors as any).confirmPassword} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Student-only Additional (Register) */}
                    {isRegister && isStudent && (
                      <div className="space-y-3 mt-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Email Address</label>
                          <div className={`relative group rounded-xl transition-all ${focusedField === "email" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                          <Input
                            {...props.register("email")}
                            className="w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                            placeholder="yourname@gmail.com"
                            onFocus={() => { setFocusedField("email"); props.handleFieldFocus("text"); }}
                            onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                          />
                          <p className="text-[10px] text-[var(--ui-accent)]/60 font-medium ml-1 mt-1">
                            * Strictly Gmail accounts only
                          </p>
                          </div>
                          <FieldError error={(props.errors as any).email} />
                        </div>
                      </div>
                    )}

                    {/* Student-only Additional (Login) */}
                    {!isRegister && isStudent && (
                      <div className="space-y-3 mt-3">
                         <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Student ID</label>
                          <div className={`relative group rounded-xl transition-all ${focusedField === "studentId" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <Input
                              {...props.register("studentId")}
                              className="w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                              placeholder="STU-2025-XXXXX"
                              onFocus={() => { setFocusedField("studentId"); props.handleFieldFocus("text"); }}
                              onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Engineer Code</label>
                          <div className={`relative group rounded-xl transition-all ${focusedField === "engineerCode" ? "ring-2 ring-[var(--ui-accent)]/25" : ""}`}>
                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <Input
                              {...props.register("engineerCode")}
                              className="w-full h-[42px] pl-10 bg-var(--ui-bg)/60 border-white/[0.05] text-white rounded-xl text-[13px]"
                              placeholder="Enter engineer code"
                              onFocus={() => { setFocusedField("engineerCode"); props.handleFieldFocus("text"); }}
                              onBlur={() => { setFocusedField(null); props.handleFieldBlur(); }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={props.loading}
                      className="w-full h-[46px] bg-gradient-to-r from-[var(--ui-accent)]/80 to-[var(--ui-accent)] text-white font-black rounded-xl uppercase tracking-widest text-[11px] mt-4 shadow-[var(--ui-accent)]/20 shadow-lg"
                    >
                      {props.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        isRegister ? <> <CheckCircle2 className="w-4 h-4 mr-2" /> Create Account </> : "Sign In"
                      )}
                    </Button>
                  </form>
                )}
              </div>

              {/* ═══ Footer ═══ */}
              <div className="mt-6 text-center">
                 <div className="relative flex items-center mb-4">
                  <div className="flex-grow h-[1px] bg-white/5" />
                  <span className="mx-4 text-[9px] text-slate-600 uppercase font-bold">Or continue with</span>
                  <div className="flex-grow h-[1px] bg-white/5" />
                </div>
                <SocialButtons mode="icon-only" layout="row" theme="dark" />
                
                <p className="text-[12px] text-slate-500 mt-6">
                  {isRegister ? (
                    <>Already have an account? <button onClick={() => props.onNavigate("/login")} className="text-emerald-400 font-bold">Sign in</button></>
                  ) : (
                    <>Don't have an account? <button onClick={() => props.onNavigate("/register")} className="text-emerald-400 font-bold">Sign up</button></>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordModal 
        isOpen={showForgotDialog} 
        onClose={() => setShowForgotDialog(false)}
        loginMode={props.loginMode}
      />
    </div>
  );
};

