import React, { useState, useEffect } from "react";
import { ShieldCheck, UserPlus, Key, Eye, CheckCircle2, XCircle, Search, RefreshCcw, MoreVertical, ShieldAlert, FileText, Clock, Users, Trash2, CheckCircle, Shield, Settings2, Sliders, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Card, Button, Input, Badge, Skeleton } from "../components/ui";
import { useSystemQueries, useAdminMutations } from "../queries/useAdminQueries";
import { usePendingStudentRequests, useEngineerMutations } from "../queries/useEngineerQueries";
import { PendingEngineer, EngineerCode } from "../types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

/* TAILWIND JIT SAFELIST
  border-amber-500/20 group-hover:border-amber-500/50 group-hover:bg-amber-950/20 border-amber-500/30 border-t-amber-500 text-amber-500 text-amber-400 group-hover:text-amber-300 drop-shadow-[0_0_8px_rgba(var(--amber-500-rgb),0.5)]
  border-[var(--ui-accent)]/20 group-hover:border-[var(--ui-accent)]/50 group-hover:bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] text-[var(--ui-accent)] text-[var(--ui-accent)] group-hover:text-[var(--ui-accent)] drop-shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.5)]
  border-purple-500/20 group-hover:border-purple-500/50 group-hover:bg-purple-950/20 border-purple-500/30 border-t-purple-500 text-purple-500 text-purple-400 group-hover:text-purple-300 drop-shadow-[0_0_8px_rgba(var(--purple-500-rgb),0.5)]
  border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:bg-emerald-950/20 border-emerald-500/30 border-t-emerald-500 text-emerald-500 text-emerald-400 group-hover:text-emerald-300 drop-shadow-[0_0_8px_rgba(var(--emerald-500-rgb),0.5)]
*/

const AdminPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "pending";
  const [activeTab, setActiveTab] = useState<"pending" | "students" | "codes" | "engineers" | "audit" | "users" | "settings">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [studentProcessingIds, setStudentProcessingIds] = useState<Set<string>>(new Set());

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["pending", "students", "codes", "engineers", "audit", "users", "settings"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    setSearchParams({ tab });
  };

  const { 
    pendingEngineers, 
    engineerCodes, 
    allEngineers, 
    auditLogs: auditLogsQuery 
  } = useSystemQueries();

  const { data: pendingStudentsData, isLoading: isLoadingStudents } = usePendingStudentRequests();
  const { banMutation, suspendMutation, restoreMutation } = useUserMutations();

  const loading = pendingEngineers.isLoading || engineerCodes.isLoading || allEngineers.isLoading || auditLogsQuery.isLoading || isLoadingStudents;
  const pending = pendingEngineers.data || [];
  const pendingStudents = pendingStudentsData || [];
  const codes = engineerCodes.data || [];
  const engineers = allEngineers.data || [];
  const auditLogs = auditLogsQuery.data || [];

  const { approveMutation, denyMutation, generateCodeMutation, revokeCodeMutation } = useAdminMutations();
  const { approveStudentMutation, denyStudentMutation } = useEngineerMutations();

  const fetchData = async () => {
    queryClient.invalidateQueries({ queryKey: ["system"] });
    queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const handleBanUser = async (id: string, role: "Student" | "Engineer") => {
    if (!window.confirm("Are you sure you want to ban this user? Access will be revoked immediately.")) return;
    try {
      await banMutation.mutateAsync({ id, role });
      toast.success("User banned successfully.");
    } catch (err) {
      toast.error("Failed to ban user.");
    }
  };

  const handleRestoreUser = async (id: string, role: "Student" | "Engineer") => {
    try {
      await restoreMutation.mutateAsync({ id, role });
      toast.success("User access restored.");
    } catch (err) {
      toast.error("Failed to restore user.");
    }
  };

  const handleApprove = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("admin.approve_success"));
    } catch (err: any) {
      const errorMsg = err.message || t("admin.approval_failed");
      toast.error(errorMsg);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeny = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await denyMutation.mutateAsync(id);
      toast.error(t("admin.deny_success"));
    } catch (err) {
      toast.error(t("common.error"));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApproveStudent = async (id: string, name: string) => {
    if (studentProcessingIds.has(id)) return;
    setStudentProcessingIds(prev => new Set(prev).add(id));
    try {
      await approveStudentMutation.mutateAsync(id);
      toast.success(t("admin.approve_success_named", { name }));
    } catch (err: any) {
      toast.error(err.message || t("admin.approval_failed"));
    } finally {
      setStudentProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDenyStudent = async (id: string, name: string) => {
    if (studentProcessingIds.has(id)) return;
    setStudentProcessingIds(prev => new Set(prev).add(id));
    try {
      await denyStudentMutation.mutateAsync(id);
      toast.error(`${name}'s request denied`);
    } catch (err: any) {
      toast.error(err.message || "Deny failed");
    } finally {
      setStudentProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleGenerateCode = async () => {
    try {
      const code = await generateCodeMutation.mutateAsync();
      toast.success(t("admin.code_success", { code: code.code }));
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  const handleRevokeCode = async (id: string) => {
    try {
      await revokeCodeMutation.mutateAsync(id);
      toast.info(t("admin.revoke_info"));
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-[var(--ui-bg)]/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-bold text-white tracking-tight flex items-center gap-4">
            <div className="p-3 bg-[var(--ui-accent)]/10 rounded-2xl border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/5">
               <ShieldCheck className="w-8 h-8 text-[var(--ui-accent)]" />
            </div>
            {t("admin.title")}
          </h1>
          <p className="text-slate-500 font-medium text-xs ps-1">
             {t("admin.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
              <p className="text-xs font-medium text-slate-500 mb-1">{t("admin.status.label")}</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow" />
                 <p className="text-xs font-semibold text-white">{t("admin.status.secure")}</p>
              </div>
           </div>
           <button 
             onClick={() => fetchData()} 
             disabled={loading}
             className="h-12 px-8 bg-white/5 border border-white/5 rounded-xl text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
           >
             <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
             {t("admin.controls.sync")}
           </button>
        </div>
      </div>

      {/* Hexagonal Stats Summary Panel */}
      <div className="px-8 py-8 border-b border-white/5 bg-[var(--ui-bg)]/80 flex flex-wrap justify-center gap-4 lg:gap-8 shrink-0 relative overflow-hidden backdrop-blur-md">
         {/* Hex Pattern Background Layer */}
         <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(30deg, transparent, transparent 20px, #ffffff 20px, #ffffff 21px), repeating-linear-gradient(150deg, transparent, transparent 20px, #ffffff 20px, #ffffff 21px)" }} />
         
         {[
           { label: t("admin.stats.pending"), value: pending.length, color: "amber", isStatus: false, icon: UserPlus },
           { label: t("admin.stats.codes"), value: codes.filter(c => !c.isUsed).length, color: "accent", isStatus: false, icon: Key, colorVar: "var(--ui-accent)" },
           { label: t("admin.stats.engineers"), value: engineers.length, color: "purple", isStatus: false, icon: Shield },
           { label: t("admin.stats.status_optimal"), value: "OPTIMAL", color: "emerald", isStatus: true, icon: CheckCircle2 }
         ].map((stat, i) => (
           <div key={i} className="relative group w-56 h-28 lg:w-64 flex items-center justify-center transition-transform hover:scale-[1.05] duration-500 hover:z-10 cursor-default">
              {/* Actual Hexagon Shape */}
              <div className={cn(
                "absolute inset-0 bg-[var(--ui-sidebar-bg)] border transition-all duration-500 flex items-center justify-center shadow-xl filter drop-shadow-2xl",
                `border-${stat.color}-500/20 group-hover:border-${stat.color}-500/50`
              )} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }}>
                 <div className={cn("absolute inset-[1px] bg-[var(--ui-bg)] transition-colors duration-500", `group-hover:bg-${stat.color}-950/20`)} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }} />
                 <div className="relative z-10 flex flex-col items-center justify-center text-center px-10 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                       {stat.color === "accent" ? (
                          <stat.icon className="w-4 h-4 text-[var(--ui-accent)] opacity-80" />
                       ) : stat.isStatus ? (
                          <div className={`w-4 h-4 rounded-full border-2 border-${stat.color}-500/30 border-t-${stat.color}-500 animate-spin`} />
                       ) : (
                          <stat.icon className={`w-4 h-4 text-${stat.color}-500 opacity-80`} />
                       )}
                      <p className={cn(
                        "text-xl font-sora font-bold tracking-tight tabular-nums transition-colors",
                        stat.color === "accent" ? "text-[var(--ui-accent)] drop-shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.5)]" : `text-${stat.color}-400 group-hover:text-${stat.color}-300 drop-shadow-[0_0_8px_rgba(var(--${stat.color}-500-rgb),0.5)]`
                      )}>{stat.value}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-tight w-[120%] truncate">{stat.label}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Hexagonal Navigation Matrix */}
      <div className="px-10 py-6 bg-[var(--ui-sidebar-bg)]/40 border-b border-white/5 flex flex-wrap gap-4 shrink-0 justify-center">
         {[
           { id: "pending", name: t("admin.tabs.pending"), icon: UserPlus },
           { id: "students", name: t("admin.tabs.students"), icon: Users },
            { id: "users", name: "User Management", icon: ShieldAlert },
           { id: "codes", name: t("admin.tabs.codes"), icon: Key },
           { id: "engineers", name: t("admin.tabs.engineers"), icon: Shield },
           { id: "settings", name: "Settings", icon: Settings2 },
            { id: "audit", name: t("admin.tabs.audit"), icon: FileText }
         ].map((item: any) => (
           <button
             key={item.id}
             onClick={() => handleTabChange(item.id)}
             className={cn(
               "group flex items-center gap-3 px-6 py-3 transition-all duration-300 relative min-w-[160px] justify-center",
               activeTab === item.id 
                 ? "text-[var(--ui-accent)] transform scale-105" 
                 : "text-slate-500 hover:text-slate-300"
             )}
           >
             {/* Hexagon Background */}
             <div className="absolute inset-0 z-0 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
               <div className={cn("w-full h-full", activeTab === item.id ? "bg-[var(--ui-accent)] shadow-glow" : "bg-slate-700")} />
             </div>
             
             {/* Hexagon Border Effect */}
             {activeTab === item.id && (
               <div className="absolute inset-0 z-0 pointer-events-none" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
                 <div className="w-full h-full border border-[var(--ui-accent)] shadow-[inset_0_0_15px_rgba(8,217,214,0.3)] bg-[var(--ui-accent)]/10" />
               </div>
             )}

             <item.icon className="w-4 h-4 relative z-10" />
             <span className="text-[12px] font-semibold relative z-10">{item.name}</span>
           </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
         {loading ? (
            <div className="p-10 space-y-6">
               {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
         ) : activeTab === "pending" ? (
            <div className="p-4 lg:p-8 animate-fade-in space-y-8">
               {/* Pending Engineers Table */}
               <div className="overflow-x-auto custom-scrollbar card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-0">
               <table className="w-full text-start border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-[var(--ui-bg)] border-b border-white/5 text-slate-500 text-xs uppercase font-semibold tracking-wide">
                        <th className="px-8 py-5 text-start">{t("admin.table.registrant")}</th>
                        <th className="px-8 py-5 text-start">{t("admin.table.requested_date")}</th>
                        <th className="px-8 py-5 text-center">{t("admin.table.security_status")}</th>
                        <th className="px-8 py-5 text-end">{t("admin.table.actions")}</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm">
                     {pending.length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-medium text-sm">{t("admin.no_pending")}</td></tr>
                     ) : pending.map((req: PendingEngineer) => (
                        <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-11 h-11 rounded-2xl bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-[var(--ui-accent)]" />
                                 </div>
                                 <div className="text-start">
                                    <p className="font-semibold text-white">{req.name}</p>
                                    <p className="text-xs text-slate-500 font-normal">{req.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 font-medium text-slate-500 text-xs">
                              {format(new Date(req.requestedAt), "MMM dd, yyyy")}
                           </td>
                           <td className="px-8 py-6 text-center">
                              <Badge variant="primary" className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-none font-medium text-[11px] px-3">{t("admin.verified_code")}</Badge>
                           </td>
                           <td className="px-8 py-6 text-end">
                              <div className="flex justify-end gap-3">
                                 <button 
                                   onClick={() => handleApprove(req.id)} 
                                   disabled={processingIds.has(req.id) || req.status !== "Pending"}
                                   className={cn(
                                      "h-9 px-6 bg-emerald-500 text-black text-[12px] font-semibold rounded-xl shadow-glow shadow-emerald-500/10 transition-all flex items-center gap-2",
                                      (processingIds.has(req.id) || req.status !== "Pending") ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-105"
                                   )}
                                 >
                                    {processingIds.has(req.id) && <RefreshCcw className="w-3 h-3 animate-spin" />}
                                    {req.status === "Approved" ? t("admin.approve") : t("admin.approve")}
                                 </button>
                                 <button 
                                   onClick={() => handleDeny(req.id)} 
                                   disabled={processingIds.has(req.id) || req.status !== "Pending"}
                                   className={cn(
                                      "h-9 px-6 bg-[var(--ui-sidebar-bg)] border border-white/5 text-red-500 text-[12px] font-semibold rounded-xl transition-all",
                                      (processingIds.has(req.id) || req.status !== "Pending") ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-red-500 hover:text-white"
                                   )}
                                 >
                                    {t("admin.deny")}
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               </div>
            </div>
         ) : activeTab === "students" ? (
             <div className="p-4 lg:p-8 animate-fade-in">
                <div className="overflow-x-auto custom-scrollbar card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-0">
                <table className="w-full text-start border-collapse min-w-[800px]">
                   <thead>
                      <tr className="bg-[var(--ui-bg)] border-b border-white/5 text-slate-500 text-xs uppercase font-semibold tracking-wide">
                         <th className="px-8 py-5 text-start">{t("admin.table.student_identity")}</th>
                         <th className="px-8 py-5 text-start">{t("admin.table.requested_group")}</th>
                         <th className="px-8 py-5 text-start">{t("admin.table.requested_date")}</th>
                         <th className="px-8 py-5 text-end">{t("admin.table.actions")}</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {pendingStudents.length === 0 ? (
                         <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-medium text-sm">{t("admin.no_pending_students")}</td></tr>
                      ) : pendingStudents.map((req: any) => (
                         <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
                                     <Users className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <div className="text-start">
                                     <p className="font-semibold text-white">{req.name}</p>
                                     <p className="text-xs text-slate-500 font-normal">{req.username} • {req.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <Badge className="bg-emerald-500/10 text-emerald-400 border-none">{req.groupName}</Badge>
                            </td>
                            <td className="px-8 py-6 font-medium text-slate-500 text-xs">
                               {format(new Date(req.requestedAt), "MMM dd, yyyy")}
                            </td>
                            <td className="px-8 py-6 text-end">
                               <div className="flex justify-end gap-3">
                                  <button 
                                    onClick={() => handleApproveStudent(req.id, req.name)} 
                                    disabled={studentProcessingIds.has(req.id)}
                                    className={cn(
                                       "h-9 px-6 bg-emerald-500 text-black text-[12px] font-semibold rounded-xl shadow-glow shadow-emerald-500/10 transition-all flex items-center gap-2",
                                       studentProcessingIds.has(req.id) ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-105"
                                    )}
                                  >
                                     {studentProcessingIds.has(req.id) && <RefreshCcw className="w-3 h-3 animate-spin" />}
                                     {t("common.approve")}
                                  </button>
                                  <button 
                                    onClick={() => handleDenyStudent(req.id, req.name)} 
                                    disabled={studentProcessingIds.has(req.id)}
                                    className={cn(
                                       "h-9 px-6 bg-[var(--ui-bg)] border border-white/5 text-red-500 text-[12px] font-semibold rounded-xl transition-all",
                                       studentProcessingIds.has(req.id) ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-red-500 hover:text-white"
                                    )}
                                  >
                                     {t("common.cancel")}
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                </div>
             </div>
          ) : activeTab === "users" ? (
               <UserManagementSection onBan={handleBanUser} onRestore={handleRestoreUser} />
           ) : activeTab === "codes" ? (
            <div className="p-8 space-y-8 animate-fade-in text-start">
               <div className="flex items-center justify-between pb-6 border-b border-white/5">
                  <div className="space-y-1">
                     <h2 className="text-lg font-sora font-bold text-white tracking-tight">{t("admin.pipeline.title")}</h2>
                     <p className="text-xs text-slate-500 font-medium">{t("admin.pipeline.subtitle")}</p>
                  </div>
                  <button 
                     onClick={handleGenerateCode}
                     className="h-11 px-8 bg-[var(--ui-accent)] text-white rounded-xl font-semibold text-[13px] transition-all shadow-glow shadow-[var(--ui-accent)]/20"
                  >
                     {t("admin.pipeline.generate")}
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {codes.map((c: EngineerCode, i: number) => (
                    <div key={i} className={cn(
                      "card-base p-6 border-2 border-dashed flex flex-col gap-6 group hover:scale-[1.02] transition-all relative overflow-hidden",
                      c.isUsed ? "border-white/5 bg-[var(--ui-sidebar-bg)]/20 opacity-40" : "border-[var(--ui-accent)]/20 bg-[var(--ui-accent)]/[0.03] hover:border-[var(--ui-accent)]"
                    )}>
                       <div className="flex items-start justify-between">
                          <div className={cn("p-2 rounded-lg", c.isUsed ? "bg-[var(--ui-sidebar-bg)]" : "bg-[var(--ui-accent)]/10")}>
                             <Key className={cn("w-4 h-4", c.isUsed ? "text-slate-600" : "text-[var(--ui-accent)]")} />
                          </div>
                          {!c.isUsed && (
                             <button onClick={() => handleRevokeCode(c.id)} className="text-slate-700 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          )}
                       </div>
                       <div className="space-y-1">
                          <p className="text-[14px] font-mono font-semibold text-white">{c.code}</p>
                          <p className="text-xs font-medium text-slate-600">
                             {c.isUsed ? `${c.usedByEngineerName}` : t("admin.code_status.active")}
                          </p>
                       </div>
                       <Key className="absolute bottom-[-10%] right-[-10%] w-16 h-16 text-white/[0.02] -rotate-12" />
                    </div>
                  ))}
               </div>
            </div>
         ) : activeTab === "engineers" ? (
            <div className="flex flex-col h-full animate-fade-in">
               <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="relative group w-full max-w-sm">
                     <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-[var(--ui-accent)]" />
                     <Input 
                       placeholder={t("common.search")}
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="ps-12 h-11 border-white/5 bg-[var(--ui-sidebar-bg)]/40 text-[13px] font-normal focus:bg-white/[0.08]"
                     />
                  </div>
               </div>
               <div className="p-4 lg:p-8 flex-1 overflow-y-auto">
                  <div className="overflow-x-auto custom-scrollbar card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-0">
                  <table className="w-full text-start border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-[var(--ui-bg)] border-b border-white/5 text-slate-500 text-xs uppercase font-semibold tracking-wide">
                           <th className="px-8 py-5 text-start">{t("admin.table.node_engineer")}</th>
                           <th className="px-8 py-5 text-start">{t("admin.table.role")}</th>
                           <th className="px-8 py-5 text-start">{t("admin.table.joined")}</th>
                           <th className="px-8 py-5 text-end">{t("admin.table.settings")}</th>
                        </tr>
                     </thead>
                     <tbody>
                        {engineers
                           .filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || e.engineerCode?.toLowerCase().includes(searchQuery.toLowerCase()))
                           .map(eng => (
                           <tr key={eng.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-[var(--ui-bg)] border border-white/5 flex items-center justify-center font-semibold text-slate-500 uppercase tracking-tighter shadow-inner">
                                       {eng.name.substring(0, 2)}
                                    </div>
                                    <div className="text-start">
                                       <p className="font-semibold text-white">{eng.name}</p>
                                       <p className="text-xs text-slate-600 font-normal">{eng.email}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-3">
                                    <Badge variant={eng.role === "Admin" ? "success" : "primary"} className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-none px-3 font-medium text-[11px]">
                                       {eng.role?.toUpperCase() === "ADMIN" ? "Admin" : t("auth.role_engineer")}
                                    </Badge>
                                    {eng.engineerCode && (
                                       <span className="text-xs font-mono font-medium text-slate-400 px-2 py-1 bg-[var(--ui-sidebar-bg)] rounded-md border border-white/5 select-all hover:text-white transition-colors cursor-pointer">{eng.engineerCode}</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-slate-500 font-medium text-xs">
                                {format(new Date(eng.createdAt || new Date()), "MMM dd, yyyy")}
                              </td>
                              <td className="px-8 py-6 text-end">
                                 <button className="p-2 hover:text-white text-slate-700 transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  </div>
               </div>
            </div>
         ) : activeTab === "settings" ? (
             <SystemSettingsSection />
         ) : (
            <div className="p-4 lg:p-8 animate-fade-in">
               <div className="overflow-x-auto custom-scrollbar card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-0">
               <table className="w-full text-start border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-[var(--ui-bg)] border-b border-white/5 text-slate-500 text-xs uppercase font-semibold tracking-wide">
                        <th className="px-8 py-5 text-start">{t("admin.table.activity")}</th>
                        <th className="px-8 py-5 text-center">{t("admin.table.origin")}</th>
                        <th className="px-8 py-5 text-end">{t("admin.table.timestamp")}</th>
                     </tr>
                  </thead>
                  <tbody>
                     {auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4 text-start">
                                 <div className="p-2 bg-[var(--ui-bg)] rounded-lg border border-white/5"><FileText className="w-3.5 h-3.5 text-slate-600" /></div>
                                 <div>
                                    <p className="text-xs font-semibold text-white">{log.action}</p>
                                    <p className="text-xs text-slate-600 font-normal">{log.details || t("admin.table.system_origin")}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-center text-[var(--ui-accent)] font-semibold text-xs">
                              {log.userName}
                           </td>
                           <td className="px-8 py-6 text-end text-slate-500 font-normal text-xs">
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: dateLocale })}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

const UserManagementSection: React.FC<{ onBan: (id: string, role: any) => void; onRestore: (id: string, role: any) => void }> = ({ onBan, onRestore }) => {
  const { allEngineers } = useSystemQueries();
  const engineers = allEngineers.data || [];
  
  return (
    <div className="p-4 lg:p-8 animate-fade-in space-y-8 text-start">
      <div className="card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Active User Matrix</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Enforcement & Oversight Center</p>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar card-base bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-0">
        <table className="w-full text-start border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[var(--ui-bg)] border-b border-white/5 text-slate-500 text-xs uppercase font-semibold tracking-wide">
              <th className="px-8 py-5 text-start">Identity</th>
              <th className="px-8 py-5 text-start">Role</th>
              <th className="px-8 py-5 text-start">Status</th>
              <th className="px-8 py-5 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((user: any) => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 flex items-center justify-center border border-[var(--ui-accent)]/20 text-[var(--ui-accent)] font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1 font-bold text-[9px] uppercase tracking-widest">
                     {user.role}
                   </Badge>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow" />
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Active</p>
                   </div>
                </td>
                <td className="px-8 py-6 text-end">
                   <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:bg-white/5 hover:text-white font-bold text-[10px] uppercase tracking-widest px-4"
                        onClick={() => toast.info("Suspension feature coming soon")}
                      >
                        <Pause className="w-3.5 h-3.5 mr-2" />
                        Suspend
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 font-bold text-[10px] uppercase tracking-widest px-4"
                        onClick={() => onBan(user.id, user.role)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-2" />
                        Terminate
                      </Button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SystemSettingsSection: React.FC = () => {
  const [saving, setSaving] = React.useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
        setSaving(false);
        toast.success("Pricing matrix updated successfully");
    }, 1200);
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in space-y-8 text-start">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-8 space-y-6 flex flex-col">
          <div className="flex items-center gap-4 mb-2">
             <div className="p-3 bg-[var(--ui-accent)]/10 rounded-xl text-[var(--ui-accent)] border border-[var(--ui-accent)]/20">
                <Sliders className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Pricing Matrix</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Dynamic Tier Management</p>
             </div>
          </div>
          
          <div className="space-y-5 flex-1">
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Subscription</label>
                    <span className="text-[10px] font-bold text-[var(--ui-accent)] tracking-widest">$29.00 / mo</span>
                </div>
                <Input defaultValue="29.00" className="bg-black/20 border-white/5 h-12 text-white font-bold" />
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pro Tier Premium</label>
                    <span className="text-[10px] font-bold text-[var(--ui-accent)] tracking-widest">x2.5 Value</span>
                </div>
                <Input defaultValue="2.5" className="bg-black/20 border-white/5 h-12 text-white font-bold" />
             </div>

             <div className="p-4 bg-[var(--ui-accent)]/[0.03] border border-[var(--ui-accent)]/10 rounded-xl">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                    Changes to the pricing matrix will apply to all future checkouts. Existing subscriptions remain on their original ledger entries.
                </p>
             </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/90 text-white font-bold text-xs uppercase tracking-widest shadow-glow shadow-[var(--ui-accent)]/20 mt-4"
          >
            {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Matrix
          </Button>
        </Card>

        <Card className="bg-[var(--ui-sidebar-bg)]/20 border-white/5 p-8 space-y-6 opacity-50 grayscale cursor-not-allowed">
           <div className="flex items-center gap-4 mb-2">
             <div className="p-3 bg-slate-500/10 rounded-xl text-slate-400 border border-slate-500/20">
                <Shield className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">System Sovereignty</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Advanced Access Control</p>
             </div>
          </div>
          <div className="space-y-4">
             <div className="h-10 bg-black/20 rounded-lg border border-white/5 animate-pulse" />
             <div className="h-10 bg-black/20 rounded-lg border border-white/5 animate-pulse" />
             <div className="h-10 bg-black/20 rounded-lg border border-white/5 animate-pulse" />
          </div>
          <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex items-center justify-center">
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Restricted Module</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
