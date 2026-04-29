import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, Users, Zap, Search, ExternalLink, SkipForward, Loader2, X, Lock, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfiniteSessions, useSessionMutations } from "../queries/useSessionQueries";
import { Session } from "../types";
import { Card, Button, Badge } from "../components/ui";
import { AttendanceWizard } from "./attendance/AttendanceWizard";
import { cn, formatDateTo12h, getCairoDateStr } from "../lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "../store/stores";
import { getTierLimits } from "../lib/limits";

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [wizardSession, setWizardSession] = useState<Session | null>(null);
  const [skipSessionId, setSkipSessionId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string>("");

  useEffect(() => {
    (window as any).onWizardComplete = (id: string) => {
      setPendingSessionId(id);
    };
    return () => {
      delete (window as any).onWizardComplete;
    };
  }, []);

  // Ensure we fetch the exact day in Cairo, bypassing the local machine timezone
  const todayStr = getCairoDateStr();
  
  const { data, isLoading } = useInfiniteSessions({
    startDate: todayStr,
    endDate: todayStr,
    pageSize: 100
  });

  const { startMutation, endMutation, skipMutation } = useSessionMutations();

  const user = useAuthStore(s => s.user);
  const limits = getTierLimits(user?.subscriptionTier);
  
  const sessions = data?.pages.flatMap(p => p.items) || [];
  const completedToday = sessions.filter(s => s.status === "Ended" && !s.isSkipped).length;
  const quotaReached = limits.maxDailyAttendance !== Infinity && completedToday >= limits.maxDailyAttendance;
  
  const filteredSessions = sessions.filter(s => {
    if (searchQuery && !s.groupName?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleMakeAttendance = (session: Session) => {
    setWizardSession(session);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--ui-accent)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 shrink-0 relative z-10">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("attendance.title") || "Attendance"}
          </h1>
          <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-2">
             <CheckCircle className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
             {t("attendance.subtitle") || "Daily Session Tracking"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search today's groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/50 focus:border-[var(--ui-accent)] transition-all"
            />
          </div>
          
          {user?.role === "Engineer" && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 bg-white/[0.03] border rounded-xl",
              quotaReached ? "border-rose-500/30 bg-rose-500/5" : "border-white/10"
            )}>
              <Zap className={cn("w-4 h-4", quotaReached ? "text-rose-500" : "text-amber-500")} />
              <span className="text-sm font-medium text-white">
                Quota: <span className={cn(quotaReached ? "text-rose-400" : "text-amber-400")}>{completedToday}</span> / {limits.maxDailyAttendance === Infinity ? "∞" : limits.maxDailyAttendance}
              </span>
              {quotaReached && (
                <button 
                  onClick={() => navigate("/pricing")} 
                  className="flex items-center gap-1 text-[10px] font-bold text-ui-accent uppercase tracking-widest hover:underline ms-2"
                >
                  Upgrade <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-8 custom-scrollbar relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--ui-accent)] border-t-transparent animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading today's schedule...</p>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Sessions Found</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              {searchQuery 
                ? "No groups match your search for today."
                : "There are no sessions scheduled for today."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSessions.map((session) => {
              const rawUtcStart = new Date(session.scheduledAt);
              const startTimeStr = formatDateTo12h(rawUtcStart);
              
              let endTimeStr = "";
              if (session.endedAt) {
                 const rawUtcEnd = new Date(session.endedAt);
                 endTimeStr = formatDateTo12h(rawUtcEnd);
              }
              
              const studentCount = session.totalStudents || 0;
              const isAttendable = session.status !== "Ended"; 
              const isScheduled = session.status === "Scheduled";
              const isActive = session.status === "Active";
              // Lock non-started sessions when quota is hit (allow already-active sessions)
              const isLockedByQuota = quotaReached && isScheduled;

              return (
                <Card key={session.id} className={cn(
                  "p-5 sm:p-6 border border-white/5 bg-[var(--ui-sidebar-bg)]/40 backdrop-blur-3xl hover:bg-white/[0.04] transition-all group flex flex-col relative overflow-hidden",
                  !isAttendable && "opacity-75",
                  isLockedByQuota && "opacity-40 blur-[0.5px] pointer-events-none select-none"
                )}>
                  {isScheduled && !isLockedByQuota && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl border-b border-l border-amber-500/20">
                      Ready
                    </div>
                  )}
                  {isLockedByQuota && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-[inherit]">
                      <Lock className="w-8 h-8 text-rose-500/80 mb-3" />
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Daily Limit Reached</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate("/pricing"); }}
                        className="pointer-events-auto px-4 py-1.5 rounded-lg bg-ui-accent text-white text-[10px] font-bold uppercase tracking-widest hover:bg-ui-accent/80 transition-colors flex items-center gap-1.5"
                      >
                        Upgrade Plan <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0 pr-4">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">{session.groupName || "Unnamed Group"}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 shrink-0"><Clock className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {startTimeStr} {endTimeStr ? `- ${endTimeStr}` : ""}</span>
                        <span className="flex items-center gap-1.5 shrink-0"><Users className="w-3.5 h-3.5 text-emerald-500" /> {studentCount} Cadets</span>
                      </div>
                    </div>
                    <Badge variant={session.status === "Ended" ? "success" : session.status === "Active" ? "warning" : "default"} className="uppercase text-[8px] sm:text-[9px] tracking-widest shrink-0">
                      {session.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
                    <Button 
                      variant={isScheduled ? "outline" : "primary"}
                      className={cn(
                        "w-full h-11 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300",
                        isAttendable && !isLockedByQuota ? "opacity-100 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "opacity-50 pointer-events-none"
                      )}
                      onClick={() => {
                        if (completedToday >= limits.maxDailyAttendance && session.status !== "Active") {
                          toast.error(`Daily attendance limit reached (${limits.maxDailyAttendance}/day). Upgrade for more.`, {
                            icon: <Zap className="w-4 h-4 text-rose-500" />,
                            action: {
                              label: "Upgrade",
                              onClick: () => navigate("/pricing"),
                            },
                          });
                          return;
                        }
                        handleMakeAttendance(session);
                      }}
                      disabled={!isAttendable || isLockedByQuota}
                    >
                      {!isAttendable ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Completed ✓
                        </>
                      ) : isScheduled ? (
                        <>
                          <Zap className="w-4 h-4" />
                          Start & Form
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Open Google Form
                        </>
                      )}
                    </Button>
                    {(session.status === "Scheduled" || session.status === "Active") && !session.isSkipped && (
                      <button
                        onClick={() => { setSkipSessionId(session.id); setSkipReason(""); }}
                        className="w-full h-9 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-amber-500 bg-white/[0.02] border border-white/5 rounded-xl hover:border-amber-500/20 hover:bg-amber-500/5 transition-all"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip Session
                      </button>
                    )}
                    {session.isSkipped && (
                      <div className="w-full h-9 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/60 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <SkipForward className="w-3.5 h-3.5" />
                        Skipped{session.skipReason ? ` · ${session.skipReason}` : ""}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {pendingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full p-6 sm:p-8 border border-white/10 bg-[var(--ui-sidebar-bg)] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--ui-accent)] to-transparent" />
            <h3 className="text-xl font-bold text-white mb-3">Complete Attendance</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Did you successfully submit the Google Form?
              <br /><br />
              Clicking <strong className="text-emerald-400">"Yes, Submitted"</strong> will mark this session as ended and increment the group's current session counter. You will not be able to edit attendance here again.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPendingSessionId(null)} className="h-10 px-5 text-sm">
                No, Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  endMutation.mutate({ id: pendingSessionId, force: true, notes: "Attendance managed via external Google Form." });
                  setPendingSessionId(null);
                }} 
                className="h-10 px-6 text-sm bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-[0_0_20_rgba(16,185,129,0.3)]"
                disabled={endMutation.isPending}
              >
                Yes, Submitted ✓
              </Button>
            </div>
          </Card>
        </div>
      )}

      {wizardSession && (
        <AttendanceWizard 
          isOpen={!!wizardSession}
          session={wizardSession}
          onClose={() => setWizardSession(null)}
        />
      )}

      {skipSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full p-6 sm:p-8 border border-amber-500/20 bg-[var(--ui-sidebar-bg)] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-transparent" />
            <button onClick={() => setSkipSessionId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <SkipForward className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Skip This Session</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Marking this session as <strong className="text-amber-400">"Skipped"</strong> means it did not take place today. 
              The session number <strong className="text-white">will NOT advance</strong>, and the next scheduled session will reuse the same number.
            </p>
            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase">Reason (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                {["Holiday", "Student cancelled", "Engineer unavailable", "Other"].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setSkipReason(reason)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
                      skipReason === reason
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSkipSessionId(null)} className="h-10 px-5 text-sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    await skipMutation.mutateAsync({ id: skipSessionId, reason: skipReason || undefined });
                    toast.success("Session marked as skipped. Session number preserved.");
                    setSkipSessionId(null);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to skip session.");
                  }
                }}
                disabled={skipMutation.isPending}
                className="h-10 px-6 text-sm bg-amber-500 hover:bg-amber-400 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {skipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Skip"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
