import React, { useState, useEffect } from "react";
import { User, Mail, Shield, Calendar, Clock, Activity, Lock, Save, Loader2, Key, Target, ShieldCheck, ArrowUpRight, TrendingUp, History, Camera, Upload, Copy, Check, LogOut, Pencil, MailCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, Button, Input, Badge, Skeleton } from "../components/ui";
import { useAuthStore } from "../store/stores";
import { useShallow } from "zustand/shallow";
import { useAuditLogs } from "../queries/useAdminQueries";
import { useDashboardSummary } from "../queries/useDashboardQueries";
import { useAuthMutations } from "../queries/useAuthQueries";
import { cn } from "../lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Display Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");

  // Email Change state
  const [emailStep, setEmailStep] = useState<'idle' | 'requesting' | 'verifying'>('idle');
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const { data: allLogs, isLoading: logsLoading } = useAuditLogs();
  const { data: stats, isLoading: statsLoading } = useDashboardSummary();
  const { 
    updatePasswordMutation, 
    updateAvatarMutation, 
    updateDisplayNameMutation, 
    requestEmailChangeMutation, 
    verifyEmailChangeMutation,
    linkSocialMutation 
  } = useAuthMutations();

  const logs = (allLogs || []).filter((l: any) => l.userName === user?.name).slice(0, 10);
  const loading = logsLoading || statsLoading;
  const isSaving = updatePasswordMutation.isPending;


  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.password_mismatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("profile.password_min_length_8", "Password must be at least 8 characters."));
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error(t("profile.password_need_uppercase", "Password must contain at least one uppercase letter."));
      return;
    }
    if (!/\d/.test(newPassword)) {
      toast.error(t("profile.password_need_digit", "Password must contain at least one digit."));
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      toast.error(t("profile.password_need_special", "Password must contain at least one special character."));
      return;
    }
    try {
      await updatePasswordMutation.mutateAsync({ oldPassword, newPassword });
      toast.success(t("profile.password_success"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("profile.password_error"));
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error(t("profile.avatar_size_error"));
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await updateAvatarMutation.mutateAsync(base64);
          toast.success(t("profile.avatar_success"));
        } catch (err) {
          toast.error(t("profile.avatar_error"));
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(t("profile.avatar_error"));
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("profile.copy_success"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-[var(--ui-bg)]/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-semibold text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-[var(--ui-accent)]/10 rounded-2xl border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/5">
               <User className="w-8 h-8 text-[var(--ui-accent)]" />
            </div>
            {t("profile.title")}
          </h1>
            <span className="text-slate-500 font-semibold text-xs uppercase opacity-80 ps-1">
               {t("profile.subtitle")}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{t("profile.clearance_level")}</p>
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-[var(--ui-accent)]" />
                   <p className="text-xs font-semibold text-white">{user?.role?.toUpperCase() || (user?.role === "Student" ? "STUDENT" : "STAFF")}</p>
                </div>
             </div>
             <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-4 h-11 flex items-center text-xs font-semibold shadow-glow shadow-emerald-500/5">{t("profile.status_active")}</Badge>
          </div>
        </div>
  
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
             {/* Primary Identity Card */}
             <div className="lg:col-span-1 space-y-8">
                <div className="card-base relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--ui-accent)]/10 blur-3xl rounded-full" />
                   <div className="flex flex-col items-center text-center relative z-10">
                      <div 
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-[2.5rem] bg-[var(--ui-sidebar-bg)] flex items-center justify-center text-4xl font-semibold text-white shadow-2xl border-4 border-white/10 mb-8 group/avatar relative overflow-hidden cursor-pointer"
                      >
                         {user?.avatarUrl ? (
                           <img src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Avatar" className="w-full h-full object-cover" key={user.avatarUrl} />
                         ) : (
                           user?.name?.charAt(0).toUpperCase()
                         )}
                         <div className="absolute inset-0 bg-[var(--ui-accent)]/80 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                            <span className="text-xs font-semibold">{isUploading ? t("common.syncing") : t("common.change")}</span>
                         </div>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                    <h2 className="text-2xl font-sora font-semibold text-white mb-0.5">{user?.displayName || user?.name}</h2>
                    {user?.displayName && user?.displayName !== user?.name && (
                      <p className="text-xs text-slate-500 font-medium mb-1">{user?.name}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      {isEditingName ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            maxLength={30}
                            className="flex-1 h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-xs font-semibold text-white focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:outline-none text-center"
                            placeholder="Display name..."
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              if (!displayName.trim() || displayName.length < 2) {
                                toast.error("Display name must be at least 2 characters.");
                                return;
                              }
                              try {
                                await updateDisplayNameMutation.mutateAsync(displayName.trim());
                                toast.success("Display name updated!");
                                setIsEditingName(false);
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to update display name.");
                              }
                            }}
                            disabled={updateDisplayNameMutation.isPending}
                            className="w-9 h-9 rounded-lg bg-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/30 flex items-center justify-center text-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-white transition-all"
                          >
                            {updateDisplayNameMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setDisplayName(user?.displayName || user?.name || ""); setIsEditingName(true); }}
                          className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-[var(--ui-accent)] transition-colors uppercase"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit Display Name
                        </button>
                      )}
                    </div>
                    <Badge variant="primary" className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-none px-6 py-1.5 font-semibold text-xs uppercase mb-8">{user?.role}</Badge>
                    
                    <div className="w-full space-y-4 pt-8 border-t border-white/5">
                       <div 
                         onClick={() => copyToClipboard(user?.role === "Student" ? user?.studentId || "N/A" : user?.engineerCode || "N/A")}
                         className="flex items-center justify-between text-[11px] font-semibold p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group/code"
                       >
                          <span className="text-slate-500">{user?.role === "Student" ? t("profile.student_id") : t("profile.engineer_code")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--ui-accent)] font-mono text-xs">{user?.role === "Student" ? user?.studentId : user?.engineerCode}</span>
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-600 group-hover/code:text-[var(--ui-accent)] transition-colors" />}
                          </div>
                       </div>
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-semibold px-1">
                          <span className="text-slate-500">{t("profile.email_relay")}</span>
                          <span className="text-slate-300 truncate w-full sm:max-w-[150px] sm:text-right">{user?.email}</span>
                       </div>
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-semibold px-1">
                          <span className="text-slate-500">{t("profile.node_id")}</span>
                          <span className="text-white font-mono text-xs">SF-{user?.id?.substring(0,8).toUpperCase()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Security Protocol Form */}
              <div className="card-base p-8 bg-[var(--ui-bg)] border-white/10 space-y-6">
                 <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-[var(--ui-accent)]" />
                    <h3 className="text-[11px] font-semibold text-white uppercase">{t("profile.security_title")}</h3>
                 </div>
                 <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 uppercase ps-1">{t("profile.current_password")}</label>
                       <input 
                         type="password" 
                         value={oldPassword} 
                         onChange={e => setOldPassword(e.target.value)}
                         className="w-full h-11 bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 uppercase ps-1">{t("profile.new_password")}</label>
                       <input 
                         type="password" 
                         value={newPassword} 
                         onChange={e => setNewPassword(e.target.value)}
                         className="w-full h-11 bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 uppercase ps-1">{t("profile.confirm_password")}</label>
                       <input 
                         type="password" 
                         value={confirmPassword} 
                         onChange={e => setConfirmPassword(e.target.value)}
                       />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12" 
                      variant="primary"
                      disabled={isSaving || !newPassword}
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : t("profile.submit_password")}
                    </Button>
                 </form>
              </div>

              {/* Email Change Card */}
              <div className="card-base p-8 bg-[var(--ui-bg)] border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <MailCheck className="w-4 h-4 text-amber-500" />
                  <h3 className="text-[11px] font-semibold text-white uppercase">Update Email Address</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">A 5-digit verification code will be sent to your <strong className="text-slate-400">current email</strong> for security.</p>
                
                {emailStep === 'idle' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase ps-1">New Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="new.email@example.com"
                        className="w-full h-11 bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-xl px-4 text-xs font-semibold text-white placeholder-slate-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newEmail.includes('@')) { toast.error("Please enter a valid email."); return; }
                        setEmailStep('requesting');
                        try {
                          await requestEmailChangeMutation.mutateAsync(newEmail);
                          toast.success("Verification code sent to your current email!");
                          setEmailStep('verifying');
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to request email change.");
                          setEmailStep('idle');
                        }
                      }}
                      variant="primary"
                      disabled={!newEmail || requestEmailChangeMutation.isPending}
                      className="w-full h-12 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white"
                    >
                      {requestEmailChangeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification Code"}
                    </Button>
                  </div>
                )}

                {emailStep === 'verifying' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
                      <p className="text-xs text-amber-500 font-semibold">Code sent to: {user?.email}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Changing to: {newEmail}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase ps-1">5-Digit Verification Code</label>
                      <input
                        type="text"
                        value={emailCode}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setEmailCode(v);
                        }}
                        maxLength={5}
                        placeholder="00000"
                        className="w-full h-14 bg-[var(--ui-sidebar-bg)] border border-amber-500/20 rounded-xl px-4 text-center text-2xl font-mono font-bold text-amber-500 tracking-[16px] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setEmailStep('idle'); setEmailCode(''); }}
                        className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={async () => {
                          if (emailCode.length !== 5) { toast.error("Enter the full 5-digit code."); return; }
                          try {
                            await verifyEmailChangeMutation.mutateAsync(emailCode);
                            toast.success("Email updated successfully!");
                            setEmailStep('idle');
                            setNewEmail('');
                            setEmailCode('');
                          } catch (err: any) {
                            toast.error(err?.message || "Verification failed.");
                          }
                        }}
                        variant="primary"
                        disabled={emailCode.length !== 5 || verifyEmailChangeMutation.isPending}
                        className="flex-1 h-12 bg-amber-500 text-white hover:bg-amber-600"
                      >
                        {verifyEmailChangeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Update"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Identity Bridge */}
              <div className="card-base p-8 bg-[var(--ui-bg)] border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-sky-500" />
                  <h3 className="text-[11px] font-semibold text-white uppercase">Social Identity Bridge</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">Link your account to enable one-tap sign-in. This does not create a new account.</p>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* Google */}
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    user?.googleId ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider">Google</p>
                        <p className="text-[9px] font-semibold text-slate-500 uppercase">{user?.googleId ? "Linked Successfully" : "Not Connected"}</p>
                      </div>
                    </div>
                    {user?.googleId ? (
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-3">ACTIVE</Badge>
                    ) : (
                      <button 
                        onClick={async () => {
                          const id = window.prompt("Enter Google Social ID (simulating OAuth result):");
                          if (!id) return;
                          try {
                            await linkSocialMutation.mutateAsync({ provider: "Google", id });
                            toast.success(t("profile.social.link_success", "Google account linked successfully!"));
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to link Google account.");
                          }
                        }}
                        disabled={linkSocialMutation.isPending}
                        className="text-[10px] font-bold text-[var(--ui-accent)] hover:underline uppercase tracking-widest disabled:opacity-50"
                      >
                        {linkSocialMutation.isPending ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>

                  {/* Facebook */}
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    user?.facebookId ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#1877F2]">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider">Facebook</p>
                        <p className="text-[9px] font-semibold text-slate-500 uppercase">{user?.facebookId ? "Linked Successfully" : "Not Connected"}</p>
                      </div>
                    </div>
                    {user?.facebookId ? (
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-3">ACTIVE</Badge>
                    ) : (
                      <button 
                         onClick={async () => {
                          const id = window.prompt("Enter Facebook Social ID (simulating OAuth result):");
                          if (!id) return;
                          try {
                            await linkSocialMutation.mutateAsync({ provider: "Facebook", id });
                            toast.success(t("profile.social.link_success", "Facebook account linked successfully!"));
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to link Facebook account.");
                          }
                        }}
                        disabled={linkSocialMutation.isPending}
                        className="text-[10px] font-bold text-[var(--ui-accent)] hover:underline uppercase tracking-widest disabled:opacity-50"
                      >
                        {linkSocialMutation.isPending ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

               {/* Sign Out */}
               <button 
                 onClick={() => { logout(); navigate("/login"); }}
                 className="w-full h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-glow shadow-rose-500/0 hover:shadow-rose-500/20 active:scale-95"
               >
                 <LogOut className="w-4 h-4" />
                 <span>{t("nav.logout")}</span>
               </button>
            </div>

           {/* Metrics & Activity Feed */}
           <div className="lg:col-span-2 space-y-12">
              {user?.role !== "Student" && (
                <>
                  {/* Tactical Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: t("profile.stats.active_groups"), value: stats?.totalGroups ?? "-", icon: Target, color: "text-[var(--ui-accent)]" },
                      { label: t("profile.stats.sessions_today"), value: stats?.todaySessions ?? "-", icon: Clock, color: "text-emerald-500" },
                      { label: t("profile.stats.total_sessions"), value: stats?.activeSessions ?? "-", icon: TrendingUp, color: "text-amber-500" }
                    ].map((metric, i) => (
                      <div key={i} className="card-base flex items-center justify-between group hover:bg-[var(--ui-sidebar-bg)] transition-all">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-600 uppercase">{metric.label}</p>
                            <p className="text-xl font-sora font-semibold text-white tabular-nums">{metric.value}</p>
                          </div>
                          <metric.icon className={cn("w-5 h-5", metric.color)} />
                      </div>
                    ))}
                  </div>

                  {/* Historical Telemetry (Activity Feed) */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-[var(--ui-accent)] rounded-full" />
                          <h3 className="text-lg font-sora font-semibold text-white">{t("profile.activity_title")}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold border-white/5 text-slate-500 uppercase">{t("profile.live_feed")}</Badge>
                    </div>

                    <div className="card-base overflow-hidden border-white/5 bg-[var(--ui-sidebar-bg)]/20 p-0">
                        {loading ? (
                          <div className="p-10 space-y-4">
                              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="py-20 flex flex-col items-center justify-center opacity-20">
                              <History className="w-16 h-16 mb-4" />
                              <p className="text-xs font-semibold">{t("profile.no_activity")}</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                              {logs.map((log, i) => (
                                <div key={i} className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                      <div className="w-10 h-10 rounded-xl bg-[var(--ui-bg)] border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-[var(--ui-accent)] transition-colors">
                                          <Activity className="w-4 h-4" />
                                      </div>
                                      <div className="space-y-1">
                                          <p className="text-xs font-semibold text-white">{log.action}</p>
                                          <p className="text-xs text-slate-600 font-bold uppercase">{log.details || t("profile.activity.system_action")}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-semibold text-slate-500 uppercase">
                                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                      </p>
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                          <Badge variant="outline" className="text-[7px] font-semibold border-none bg-emerald-500/10 text-emerald-500 px-1.5 h-4">SUCCESS</Badge>
                                      </div>
                                    </div>
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>
                </>
              )}
              {user?.role === "Student" && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-40 grayscale">
                   <div className="w-24 h-24 rounded-full bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center">
                      <Shield className="w-10 h-10 text-slate-600" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-xl font-sora font-semibold text-white uppercase">{t("profile.student_restricted")}</h3>
                     <p className="text-xs font-bold text-slate-500 uppercase">{t("profile.student_restricted_desc")}</p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

