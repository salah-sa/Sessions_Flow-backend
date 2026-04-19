import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Search, RefreshCcw, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Card, Button, Input, Badge } from "../components/ui";
import { usePendingStudentRequests, useEngineerMutations } from "../queries/useEngineerQueries";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

const StaffPortalPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("requestId");

  const [activeTab, setActiveTab] = useState<"students">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const { data: pendingData, isLoading } = usePendingStudentRequests();
  const pendingStudents = pendingData || [];

  const { approveStudentMutation, denyStudentMutation } = useEngineerMutations();

  const fetchData = async () => {
    queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
  };

  const handleApprove = async (id: string, name: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await approveStudentMutation.mutateAsync(id);
      toast.success(`${name} approved successfully`);
    } catch (err: any) {
      toast.error(err.message || t("admin.approval_failed"));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeny = async (id: string, name: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await denyStudentMutation.mutateAsync(id);
      toast.error(`${name}'s request denied`);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filteredStudents = pendingStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto h-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white relative">
            <ShieldCheck className="w-6 h-6" />
            <div className="absolute inset-0 border border-white/20 rounded-xl" />
          </div>
          <div className="text-start">
            <h1 className="text-2xl sm:text-3xl font-sora font-bold tracking-tight text-white mb-1">
              {t("staff.portal_title")}
            </h1>
            <p className="text-sm font-medium text-slate-400">
              {t("staff.portal_desc")}
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={fetchData}
          disabled={isLoading}
          className="h-10 px-4 bg-var(--ui-sidebar-bg) border-white/10 hover:bg-white/5 active:scale-95 transition-all w-full sm:w-auto font-semibold text-[11px] uppercase text-white shadow-xl shadow-black/50"
        >
          <RefreshCcw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      </div>

      <div className="space-y-6 flex-1 min-h-0 bg-var(--ui-sidebar-bg)/50 rounded-xl border border-white/5 p-4 sm:p-6 text-start">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between border-b border-white/10 pb-4">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 sm:pb-0">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("students")}
              className={cn(
                "h-10 px-5 font-semibold tracking-wider text-[11px] rounded-lg transition-all shrink-0 border border-transparent shadow-none gap-2",
                activeTab === "students" 
                  ? "bg-var(--ui-surface) text-white border-white/10" 
                  : "text-slate-400 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <Users className="w-4 h-4" />
              {t("staff.pending_title")}
              {pendingStudents.length > 0 && activeTab !== "students" && (
                <div className="ml-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 min-h-0">
          <Card className="bg-var(--ui-sidebar-bg) border-white/10 shadow-2xl overflow-hidden h-full flex flex-col pt-0">
             <div className="p-4 border-b border-white/5 flex flex-col justify-end bg-var(--ui-sidebar-bg)/50 shrink-0">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder={t("staff.search_students")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 w-full bg-var(--ui-bg) border-white/5 focus:border-white/10 transition-all font-medium text-sm text-white" 
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <div className="min-w-[800px] h-full flex flex-col">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 border-b border-white/5 bg-var(--ui-sidebar-bg)/80 sticky top-0 z-10 backdrop-blur-xl h-12 sm:h-[46px]">
                    <div className="col-span-3 lg:col-span-4 flex items-center text-xs sm:text-[11px] font-semibold text-slate-500">{t("staff.student_info")}</div>
                    <div className="col-span-3 lg:col-span-2 flex items-center text-xs sm:text-[11px] font-semibold text-slate-500">{t("staff.target_group")}</div>
                    <div className="col-span-2 flex items-center text-xs sm:text-[11px] font-semibold text-slate-500">{t("common.date")}</div>
                    <div className="col-span-4 flex items-center justify-end text-xs sm:text-[11px] font-semibold text-slate-500">{t("common.actions")}</div>
                  </div>

                  {/* Table Body */}
                  <div className="flex-1 relative pb-16">
                    {isLoading ? (
                      <div className="absolute inset-0 p-6 flex flex-col justify-center items-center gap-4">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <span className="text-slate-400 font-medium text-sm animate-pulse tracking-wide">{t("staff.syncing")}</span>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {filteredStudents.map((req: any) => (
                          <div 
                            key={req.id} 
                            className={cn(
                              "grid grid-cols-12 gap-4 px-6 py-4 items-center group transition-all",
                              "hover:bg-var(--ui-surface)/50",
                              highlightId === req.id && "bg-emerald-500/10 border-l-4 border-l-emerald-500"
                            )}
                          >
                            <div className="col-span-3 lg:col-span-4 min-w-0 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-var(--ui-surface) flex items-center justify-center border border-white/5 shrink-0 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors">
                                  <Users className="w-4 h-4 text-emerald-500/70" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-sora font-semibold text-[13px] text-white truncate mb-0.5 group-hover:text-emerald-400 transition-colors">{req.name}</p>
                                  <div className="flex items-center gap-2">
                                     <p className="text-[11px] font-medium text-slate-500 truncate">{req.username}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="col-span-3 lg:col-span-2 flex items-center">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{req.groupName}</Badge>
                            </div>
                            <div className="col-span-2 flex items-center text-start">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-slate-300">
                                  {format(new Date(req.requestedAt), "dd MMM")}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true, locale: dateLocale })}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-4 flex items-center justify-end gap-2 shrink-0">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-4 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10 text-xs font-semibold"
                                onClick={() => handleApprove(req.id, req.name)}
                                disabled={processingIds.has(req.id)}
                              >
                                {processingIds.has(req.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t("common.approve")}</span>
                                  </>
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 px-4 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent shadow-none text-xs font-semibold"
                                onClick={() => handleDeny(req.id, req.name)}
                                disabled={processingIds.has(req.id)}
                              >
                                {processingIds.has(req.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t("common.deny")}</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute inset-0 p-6 flex flex-col justify-center items-center text-center opacity-60">
                        <div className="w-16 h-16 rounded-full bg-var(--ui-surface) flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{t("staff.no_requests")}</h3>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          {t("staff.no_requests_desc")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffPortalPage;
