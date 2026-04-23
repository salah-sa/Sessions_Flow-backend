import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, Users, Zap, Search, ExternalLink } from "lucide-react";
import { useInfiniteSessions, useSessionMutations } from "../queries/useSessionQueries";
import { Session } from "../types";
import { Card, Button, Badge } from "../components/ui";
import { AttendanceWizard } from "./attendance/AttendanceWizard";
import { cn } from "../lib/utils";

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [wizardSession, setWizardSession] = useState<Session | null>(null);

  useEffect(() => {
    (window as any).onWizardComplete = (id: string) => {
      setPendingSessionId(id);
    };
    return () => {
      delete (window as any).onWizardComplete;
    };
  }, []);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const { data, isLoading } = useInfiniteSessions({
    startDate: todayStr,
    endDate: todayStr,
    pageSize: 100
  });

  const { startMutation, endMutation } = useSessionMutations();

  const sessions = data?.pages.flatMap(p => p.items) || [];
  
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
           
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl">
            <Calendar className="w-4 h-4 text-[var(--ui-accent)]" />
            <span className="text-sm font-medium text-white">
              {format(new Date(), "MMM d, yyyy")}
            </span>
          </div>
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
              const h = rawUtcStart.getUTCHours();
              const m = rawUtcStart.getUTCMinutes();
              
              const startTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              
              let endTimeStr = "";
              if (session.endedAt) {
                 const rawUtcEnd = new Date(session.endedAt);
                 const eh = rawUtcEnd.getUTCHours();
                 const em = rawUtcEnd.getUTCMinutes();
                 endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
              }
              
              const studentCount = session.totalStudents || 0;
              
              const isAttendable = session.status !== "Ended"; 
              const isScheduled = session.status === "Scheduled";

              return (
              <Card key={session.id} className={cn(
                "p-5 sm:p-6 border border-white/5 bg-[var(--ui-sidebar-bg)]/40 backdrop-blur-3xl hover:bg-white/[0.04] transition-all group flex flex-col relative overflow-hidden",
                !isAttendable && "opacity-75"
              )}>
                {isScheduled && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl border-b border-l border-amber-500/20">
                    Ready
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
                
                <div className="mt-auto pt-6 border-t border-white/5">
                  <Button 
                    variant={isScheduled ? "outline" : "primary"}
                    className={cn(
                      "w-full h-11 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300",
                      isAttendable ? "opacity-100 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "opacity-50 pointer-events-none"
                    )}
                    onClick={() => handleMakeAttendance(session)}
                    disabled={!isAttendable}
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
                className="h-10 px-6 text-sm bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
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
    </div>
  );
};

export default AttendancePage;
