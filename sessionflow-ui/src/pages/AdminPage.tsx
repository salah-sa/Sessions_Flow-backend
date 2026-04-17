import React, { useState, useEffect } from "react";
import { ShieldCheck, UserPlus, Key, Eye, CheckCircle2, XCircle, Search, RefreshCcw, MoreVertical, ShieldAlert, FileText, Clock, Users, Trash2, CheckCircle, Shield } from "lucide-react";
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

/* TAILWIND JIT SAFELIST
  border-amber-500/20 group-hover:border-amber-500/50 group-hover:bg-amber-950/20 border-amber-500/30 border-t-amber-500 text-amber-500 text-amber-400 group-hover:text-amber-300 drop-shadow-[0_0_8px_rgba(var(--amber-500-rgb),0.5)]
  border-brand-500/20 group-hover:border-brand-500/50 group-hover:bg-brand-950/20 border-brand-500/30 border-t-brand-500 text-brand-500 text-brand-400 group-hover:text-brand-300 drop-shadow-[0_0_8px_rgba(var(--brand-500-rgb),0.5)]
  border-purple-500/20 group-hover:border-purple-500/50 group-hover:bg-purple-950/20 border-purple-500/30 border-t-purple-500 text-purple-500 text-purple-400 group-hover:text-purple-300 drop-shadow-[0_0_8px_rgba(var(--purple-500-rgb),0.5)]
  border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:bg-emerald-950/20 border-emerald-500/30 border-t-emerald-500 text-emerald-500 text-emerald-400 group-hover:text-emerald-300 drop-shadow-[0_0_8px_rgba(var(--emerald-500-rgb),0.5)]
*/

const AdminPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "students" | "codes" | "engineers" | "audit">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [studentProcessingIds, setStudentProcessingIds] = useState<Set<string>>(new Set());

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const { 
    pendingEngineers, 
    engineerCodes, 
    allEngineers, 
    auditLogs: auditLogsQuery 
  } = useSystemQueries();

  const { data: pendingStudentsData, isLoading: isLoadingStudents } = usePendingStudentRequests();

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
  };

  const handleApprove = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("admin.approve_success"));
    } catch (err: any) {
      const errorMsg = err.message || "Approval protocol failed";
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
      toast.success(`${name} approved successfully`);
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
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
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-glow shadow-brand-500/5">
               <ShieldCheck className="w-8 h-8 text-brand-500" />
            </div>
            {t("admin.title") || "Access Control Command"}
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-80 ps-1">
             {t("admin.subtitle") || "Security protocols and identity clearance management"}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t("admin.status.label") || "Firewall Integrity"}</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow" />
                 <p className="text-xs font-black text-white uppercase tracking-tighter">{t("admin.status.secure") || "SECURE"}</p>
              </div>
           </div>
           <button 
             onClick={() => fetchData()} 
             disabled={loading}
             className="h-12 px-8 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
           >
             <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
             {t("admin.controls.sync") || "Sync Matrix"}
           </button>
        </div>
      </div>

      {/* Hexagonal Stats Summary Panel */}
      <div className="px-8 py-8 border-b border-white/5 bg-slate-950/80 flex flex-wrap justify-center gap-4 lg:gap-8 shrink-0 relative overflow-hidden backdrop-blur-md">
         {/* Hex Pattern Background Layer */}
         <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(30deg, transparent, transparent 20px, #ffffff 20px, #ffffff 21px), repeating-linear-gradient(150deg, transparent, transparent 20px, #ffffff 20px, #ffffff 21px)" }} />
         
         {[
           { label: t("admin.stats.pending"), value: pending.length, color: "amber", isStatus: false, icon: UserPlus },
           { label: t("admin.stats.codes"), value: codes.filter(c => !c.isUsed).length, color: "brand", isStatus: false, icon: Key },
           { label: t("admin.stats.engineers"), value: engineers.length, color: "purple", isStatus: false, icon: Shield },
           { label: t("admin.stats.status_optimal"), value: "OPTIMAL", color: "emerald", isStatus: true, icon: CheckCircle2 }
         ].map((stat, i) => (
           <div key={i} className="relative group w-56 h-28 lg:w-64 flex items-center justify-center transition-transform hover:scale-[1.05] duration-500 hover:z-10 cursor-default">
              {/* Actual Hexagon Shape */}
              <div className={cn(
                "absolute inset-0 bg-slate-900 border transition-all duration-500 flex items-center justify-center shadow-xl filter drop-shadow-2xl",
                `border-${stat.color}-500/20 group-hover:border-${stat.color}-500/50`
              )} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }}>
                 <div className={cn("absolute inset-[1px] bg-slate-950 transition-colors duration-500", `group-hover:bg-${stat.color}-950/20`)} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }} />
                 <div className="relative z-10 flex flex-col items-center justify-center text-center px-10 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      {stat.isStatus ? (
                         <div className={`w-4 h-4 rounded-full border-2 border-${stat.color}-500/30 border-t-${stat.color}-500 animate-spin`} />
                      ) : (
                         <stat.icon className={`w-4 h-4 text-${stat.color}-500 opacity-80`} />
                      )}
                      <p className={`text-xl font-sora font-black tracking-tighter tabular-nums drop-shadow-[0_0_8px_rgba(var(--${stat.color}-500-rgb),0.5)] text-${stat.color}-400 group-hover:text-${stat.color}-300 transition-colors`}>{stat.value}</p>
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-tight w-[120%] truncate">{stat.label}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Hexagonal Navigation Matrix */}
      <div className="px-10 py-6 bg-slate-900/40 border-b border-white/5 flex flex-wrap gap-4 shrink-0 justify-center">
         {[
           { id: "pending", name: t("admin.tabs.pending"), icon: UserPlus },
           { id: "students", name: "Students", icon: Users },
           { id: "codes", name: t("admin.tabs.codes"), icon: Key },
           { id: "engineers", name: t("admin.tabs.engineers"), icon: Shield },
           { id: "audit", name: t("admin.tabs.audit"), icon: FileText }
         ].map((item: any) => (
           <button
             key={item.id}
             onClick={() => setActiveTab(item.id as any)}
             className={cn(
               "group flex items-center gap-3 px-6 py-3 transition-all duration-300 relative min-w-[160px] justify-center",
               activeTab === item.id 
                 ? "text-brand-500 transform scale-105" 
                 : "text-slate-500 hover:text-slate-300"
             )}
           >
             {/* Hexagon Background */}
             <div className="absolute inset-0 z-0 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
               <div className={cn("w-full h-full", activeTab === item.id ? "bg-brand-500 shadow-glow" : "bg-slate-700")} />
             </div>
             
             {/* Hexagon Border Effect */}
             {activeTab === item.id && (
               <div className="absolute inset-0 z-0 pointer-events-none" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
                 <div className="w-full h-full border border-brand-500 shadow-[inset_0_0_15px_rgba(8,217,214,0.3)] bg-brand-500/10" />
               </div>
             )}

             <item.icon className="w-4 h-4 relative z-10" />
             <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{item.name}</span>
           </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
         {loading ? (
            <div className="p-10 space-y-6">
               {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
         ) : activeTab === "pending" ? (
            <div className="p-4 lg:p-8 animate-fade-in">
               <div className="overflow-x-auto custom-scrollbar card-base bg-slate-900/20 border-white/5 p-0">
               <table className="w-full text-start border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-slate-950 border-b border-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                        <th className="px-8 py-5 text-start">{t("admin.table.registrant")}</th>
                        <th className="px-8 py-5 text-start">{t("admin.table.requested_date")}</th>
                        <th className="px-8 py-5 text-center">{t("admin.table.security_status")}</th>
                        <th className="px-8 py-5 text-end">{t("admin.table.actions")}</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm">
                     {pending.length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">{t("admin.no_pending")}</td></tr>
                     ) : pending.map((req: PendingEngineer) => (
                        <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-11 h-11 rounded-2xl bg-brand-500/5 border border-brand-500/10 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-brand-500" />
                                 </div>
                                 <div className="text-start">
                                    <p className="font-black text-white uppercase tracking-tight">{req.name}</p>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{req.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 font-black text-slate-500 uppercase text-[10px] tracking-widest">
                              {format(new Date(req.requestedAt), "MMM dd, yyyy")}
                           </td>
                           <td className="px-8 py-6 text-center">
                              <Badge variant="primary" className="bg-brand-500/10 text-brand-500 border-none font-black text-[8px] px-3 uppercase">{t("admin.verified_code")}</Badge>
                           </td>
                           <td className="px-8 py-6 text-end">
                              <div className="flex justify-end gap-3">
                                 <button 
                                   onClick={() => handleApprove(req.id)} 
                                   disabled={processingIds.has(req.id) || req.status !== "Pending"}
                                   className={cn(
                                      "h-9 px-6 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-glow shadow-emerald-500/10 transition-all flex items-center gap-2",
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
                                      "h-9 px-6 bg-slate-900 border border-white/5 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
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
                <div className="overflow-x-auto custom-scrollbar card-base bg-slate-900/20 border-white/5 p-0">
                <table className="w-full text-start border-collapse min-w-[800px]">
                   <thead>
                      <tr className="bg-slate-950 border-b border-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                         <th className="px-8 py-5 text-start">Student Identity</th>
                         <th className="px-8 py-5 text-start">Requested Group</th>
                         <th className="px-8 py-5 text-start">Requested Date</th>
                         <th className="px-8 py-5 text-end">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {pendingStudents.length === 0 ? (
                         <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">No Pending Students</td></tr>
                      ) : pendingStudents.map((req: any) => (
                         <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
                                     <Users className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <div className="text-start">
                                     <p className="font-black text-white uppercase tracking-tight">{req.name}</p>
                                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{req.username} • {req.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <Badge className="bg-emerald-500/10 text-emerald-400 border-none">{req.groupName}</Badge>
                            </td>
                            <td className="px-8 py-6 font-black text-slate-500 uppercase text-[10px] tracking-widest">
                               {format(new Date(req.requestedAt), "MMM dd, yyyy")}
                            </td>
                            <td className="px-8 py-6 text-end">
                               <div className="flex justify-end gap-3">
                                  <button 
                                    onClick={() => handleApproveStudent(req.id, req.name)} 
                                    disabled={studentProcessingIds.has(req.id)}
                                    className={cn(
                                       "h-9 px-6 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-glow shadow-emerald-500/10 transition-all flex items-center gap-2",
                                       studentProcessingIds.has(req.id) ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-105"
                                    )}
                                  >
                                     {studentProcessingIds.has(req.id) && <RefreshCcw className="w-3 h-3 animate-spin" />}
                                     Approve
                                  </button>
                                  <button 
                                    onClick={() => handleDenyStudent(req.id, req.name)} 
                                    disabled={studentProcessingIds.has(req.id)}
                                    className={cn(
                                       "h-9 px-6 bg-slate-900 border border-white/5 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                                       studentProcessingIds.has(req.id) ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-red-500 hover:text-white"
                                    )}
                                  >
                                     Cancel
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                </div>
             </div>
          ) : activeTab === "codes" ? (
            <div className="p-8 space-y-8 animate-fade-in text-start">
               <div className="flex items-center justify-between pb-6 border-b border-white/5">
                  <div className="space-y-1">
                     <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight">{t("admin.pipeline.title")}</h2>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t("admin.pipeline.subtitle")}</p>
                  </div>
                  <button 
                     onClick={handleGenerateCode}
                     className="h-11 px-8 bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-glow shadow-brand-500/20"
                  >
                     {t("admin.pipeline.generate")}
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {codes.map((c: EngineerCode, i: number) => (
                    <div key={i} className={cn(
                      "card-base p-6 border-2 border-dashed flex flex-col gap-6 group hover:scale-[1.02] transition-all relative overflow-hidden",
                      c.isUsed ? "border-white/5 bg-slate-900/20 opacity-40" : "border-brand-500/20 bg-brand-500/[0.03] hover:border-brand-500"
                    )}>
                       <div className="flex items-start justify-between">
                          <div className={cn("p-2 rounded-lg", c.isUsed ? "bg-slate-900" : "bg-brand-500/10")}>
                             <Key className={cn("w-4 h-4", c.isUsed ? "text-slate-600" : "text-brand-500")} />
                          </div>
                          {!c.isUsed && (
                             <button onClick={() => handleRevokeCode(c.id)} className="text-slate-700 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          )}
                       </div>
                       <div className="space-y-1">
                          <p className="text-[14px] font-mono font-black text-white tracking-[0.2em]">{c.code}</p>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
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
                     <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-brand-500" />
                     <Input 
                       placeholder={t("common.search")}
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="ps-12 h-11 border-white/5 bg-slate-900/40 text-[10px] font-black uppercase tracking-widest focus:bg-white/[0.08]"
                     />
                  </div>
               </div>
               <div className="p-4 lg:p-8 flex-1 overflow-y-auto">
                  <div className="overflow-x-auto custom-scrollbar card-base bg-slate-900/20 border-white/5 p-0">
                  <table className="w-full text-start border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-950 border-b border-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest">
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
                                    <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center font-black text-slate-500 uppercase tracking-tighter shadow-inner">
                                       {eng.name.substring(0, 2)}
                                    </div>
                                    <div className="text-start">
                                       <p className="font-black text-white uppercase tracking-tight">{eng.name}</p>
                                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{eng.email}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-3">
                                    <Badge variant={eng.role === "Admin" ? "success" : "primary"} className="bg-brand-500/10 text-brand-500 border-none px-3 font-black text-[8px] tracking-widest">
                                       {eng.role?.toUpperCase() || "UNIT"}
                                    </Badge>
                                    {eng.engineerCode && (
                                       <span className="text-[10px] font-mono font-black text-slate-400 tracking-widest px-2 py-1 bg-slate-900 rounded-md border border-white/5 select-all hover:text-white transition-colors cursor-pointer">{eng.engineerCode}</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-slate-500 font-black text-[10px] uppercase tracking-widest">
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
         ) : (
            <div className="p-4 lg:p-8 animate-fade-in">
               <div className="overflow-x-auto custom-scrollbar card-base bg-slate-900/20 border-white/5 p-0">
               <table className="w-full text-start border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-slate-950 border-b border-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest">
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
                                 <div className="p-2 bg-slate-950 rounded-lg border border-white/5"><FileText className="w-3.5 h-3.5 text-slate-600" /></div>
                                 <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-tight">{log.action}</p>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{log.details || "SYSTEM-CORE"}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-center text-brand-500 font-black uppercase text-[10px] tracking-widest">
                              {log.userName}
                           </td>
                           <td className="px-8 py-6 text-end text-slate-500 font-black uppercase text-[9px] tracking-widest">
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

export default AdminPage;
