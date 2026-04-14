import React, { useState, useEffect } from "react";
import { User, Mail, Shield, Calendar, Clock, Activity, Lock, Save, Loader2, Key, Target, ShieldCheck, ArrowUpRight, TrendingUp, History, Camera, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Badge, Skeleton } from "../components/ui";
import { useAuthStore } from "../store/stores";
import { useAuditLogs } from "../queries/useSystemQueries";
import { useDashboardSummary } from "../queries/useDashboardQueries";
import { useAuthMutations } from "../queries/useAuthQueries";
import { cn } from "../lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, setAuth } = useAuthStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: allLogs, isLoading: logsLoading } = useAuditLogs();
  const { data: stats, isLoading: statsLoading } = useDashboardSummary();
  const { updatePasswordMutation, updateAvatarMutation } = useAuthMutations();

  const logs = (allLogs || []).filter((l: any) => l.userName === user?.name).slice(0, 10);
  const loading = logsLoading || statsLoading;
  const isSaving = updatePasswordMutation.isPending;


  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.password_mismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("profile.password_min_length"));
      return;
    }
    try {
      await updatePasswordMutation.mutateAsync({ oldPassword, newPassword });
      toast.success(t("profile.password_success"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || t("profile.password_error"));
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
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-glow shadow-brand-500/5">
               <User className="w-8 h-8 text-brand-500" />
            </div>
            {t("profile.title")}
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-80 ps-1">
             {t("profile.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t("profile.clearance_level")}</p>
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-brand-500" />
                 <p className="text-xs font-black text-white uppercase tracking-tighter">{user?.role?.toUpperCase() || "CADET-ENGINEER"}</p>
              </div>
           </div>
           <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-4 h-11 flex items-center text-[10px] font-black tracking-widest uppercase shadow-glow shadow-emerald-500/5">{t("profile.status_active")}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
           {/* Primary Identity Card */}
           <div className="lg:col-span-1 space-y-8">
              <div className="card-base p-10 bg-slate-900/40 border-white/5 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
                 <div className="flex flex-col items-center text-center relative z-10">
                    <div 
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className="w-32 h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-4xl font-black text-white shadow-2xl border-4 border-white/10 mb-8 group/avatar relative overflow-hidden cursor-pointer"
                    >
                       {user?.avatarUrl ? (
                         <img src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Avatar" className="w-full h-full object-cover" key={user.avatarUrl} />
                       ) : (
                         user?.name?.charAt(0).toUpperCase()
                       )}
                       <div className="absolute inset-0 bg-brand-500/80 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                          <span className="text-[8px] font-black uppercase tracking-widest">{isUploading ? "SYNCING" : "UPDATE"}</span>
                       </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                    <h2 className="text-2xl font-sora font-black text-white uppercase tracking-tight mb-2">{user?.name}</h2>
                    <Badge variant="primary" className="bg-brand-500/10 text-brand-500 border-none px-6 py-1.5 font-black text-[10px] tracking-widest uppercase mb-8">{user?.role}</Badge>
                    
                    <div className="w-full space-y-4 pt-8 border-t border-white/5">
                       <div 
                         onClick={() => copyToClipboard(user?.role === "Student" ? user?.studentId || "N/A" : user?.engineerCode || "N/A")}
                         className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group/code"
                       >
                          <span className="text-slate-500">{user?.role === "Student" ? t("profile.student_id") : t("profile.engineer_code")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-500 font-mono text-xs">{user?.role === "Student" ? user?.studentId : user?.engineerCode}</span>
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-600 group-hover/code:text-brand-500 transition-colors" />}
                          </div>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-1">
                          <span className="text-slate-500">{t("profile.email_relay")}</span>
                          <span className="text-slate-300 truncate max-w-[150px]">{user?.email}</span>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-1">
                          <span className="text-slate-500">{t("profile.node_id")}</span>
                          <span className="text-white font-mono text-xs">SF-{user?.id?.substring(0,8).toUpperCase()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Security Protocol Form */}
              <div className="card-base p-8 bg-slate-950 border-white/10 space-y-6">
                 <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-brand-500" />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{t("profile.security_title")}</h3>
                 </div>
                 <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ps-1">{t("profile.current_password")}</label>
                       <input 
                         type="password" 
                         value={oldPassword} 
                         onChange={e => setOldPassword(e.target.value)}
                         className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-black text-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ps-1">{t("profile.new_password")}</label>
                       <input 
                         type="password" 
                         value={newPassword} 
                         onChange={e => setNewPassword(e.target.value)}
                         className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-black text-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ps-1">{t("profile.confirm_password")}</label>
                       <input 
                         type="password" 
                         value={confirmPassword} 
                         onChange={e => setConfirmPassword(e.target.value)}
                         className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-black text-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                       />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSaving || !newPassword}
                      className="w-full h-11 bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-glow shadow-brand-500/20 mt-4"
                    >
                       {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("profile.submit_password")}
                    </button>
                 </form>
              </div>
           </div>

           {/* Metrics & Activity Feed */}
           <div className="lg:col-span-2 space-y-12">
              {user?.role !== "Student" && (
                <>
                  {/* Tactical Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: t("profile.stats.active_groups"), value: stats?.totalGroups ?? "-", icon: Target, color: "text-brand-500" },
                      { label: t("profile.stats.sessions_today"), value: stats?.todaySessions ?? "-", icon: Clock, color: "text-emerald-500" },
                      { label: t("profile.stats.total_sessions"), value: stats?.activeSessions ?? "-", icon: TrendingUp, color: "text-amber-500" }
                    ].map((metric, i) => (
                      <div key={i} className="card-base p-6 bg-slate-900/40 border-white/5 flex items-center justify-between group hover:bg-slate-900 transition-all">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{metric.label}</p>
                            <p className="text-xl font-sora font-black text-white tabular-nums">{metric.value}</p>
                          </div>
                          <metric.icon className={cn("w-5 h-5", metric.color)} />
                      </div>
                    ))}
                  </div>

                  {/* Historical Telemetry (Activity Feed) */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
                          <h3 className="text-lg font-sora font-black text-white uppercase tracking-tight">{t("profile.activity_title")}</h3>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black border-white/5 text-slate-500 uppercase tracking-widest">{t("profile.live_feed")}</Badge>
                    </div>

                    <div className="card-base overflow-hidden border-white/5 bg-slate-900/20 p-0">
                        {loading ? (
                          <div className="p-10 space-y-4">
                              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="py-20 flex flex-col items-center justify-center opacity-20">
                              <History className="w-16 h-16 mb-4" />
                              <p className="text-xs font-black uppercase tracking-widest">{t("profile.no_activity")}</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                              {logs.map((log, i) => (
                                <div key={i} className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-500 transition-colors">
                                          <Activity className="w-4 h-4" />
                                      </div>
                                      <div className="space-y-1">
                                          <p className="text-xs font-black text-white uppercase tracking-tight">{log.action}</p>
                                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{log.details || "SYSTEM EXECUTION"}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                      </p>
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                          <Badge variant="outline" className="text-[7px] font-black border-none bg-emerald-500/10 text-emerald-500 px-1.5 h-4">SUCCESS</Badge>
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
                   <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                      <Shield className="w-10 h-10 text-slate-600" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-xl font-sora font-black text-white uppercase tracking-widest">{t("profile.student_restricted")}</h3>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("profile.student_restricted_desc")}</p>
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
