import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, Users, Zap, Search } from "lucide-react";
import { useInfiniteSessions } from "../queries/useSessionQueries";
import { Session } from "../types";
import { Card, Button, Badge } from "../components/ui";
import { AttendanceWizard } from "./attendance/AttendanceWizard";
import { cn } from "../lib/utils";

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  // Cairo offset is +2
  const { data, isLoading } = useInfiniteSessions({
    startDate: todayStr,
    endDate: todayStr,
    pageSize: 100
  });

  const sessions = data?.pages.flatMap(p => p.items) || [];
  
  const filteredSessions = sessions.filter(s => {
    if (searchQuery && !s.groupName?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleMakeAttendance = (session: Session) => {
    setSelectedSession(session);
    setIsWizardOpen(true);
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
               placeholder={t("attendance.search") || "Search groups..."}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full sm:w-64 h-12 rounded-xl border border-white/5 bg-white/[0.02] pl-11 pr-4 text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
             />
           </div>
           <div className="flex items-center gap-2 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border border-white/5 rounded-xl px-5 h-12 shadow-xl shrink-0">
             <Calendar className="w-4 h-4 text-[var(--ui-accent)]" />
             <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">{format(new Date(), "EEEE, MMM d")}</span>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 md:px-8 pb-8 overflow-y-auto custom-scrollbar relative z-10">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center h-64 gap-4">
             <div className="w-8 h-8 border-2 border-[var(--ui-accent)] border-t-transparent rounded-full animate-spin" />
             <span className="text-xs font-bold uppercase text-slate-500 tracking-widest">Loading sessions...</span>
           </div>
        ) : filteredSessions.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 gap-4 border border-white/5 bg-white/[0.02] rounded-2xl p-6 text-center">
             <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-slate-500" />
             </div>
             <h3 className="text-lg font-bold text-white">No Sessions Today</h3>
             <p className="text-slate-500 text-sm">You don't have any scheduled sessions for today.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSessions.map((session) => {
              // Backend stores Cairo local time AS UTC (e.g., 7:00 PM Cairo → 19:00 UTC)
              // Use getUTCHours/Minutes to extract the raw stored values directly
              const raw = new Date(session.scheduledAt);
              const h = raw.getUTCHours();
              const m = raw.getUTCMinutes();
              const ampm = h >= 12 ? 'PM' : 'AM';
              const startTimeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
              
              let endTimeStr = "";
              if (session.durationMinutes) {
                const totalMin = h * 60 + m + session.durationMinutes;
                const eh = Math.floor(totalMin / 60) % 24;
                const em = totalMin % 60;
                const eampm = eh >= 12 ? 'PM' : 'AM';
                endTimeStr = `${eh % 12 || 12}:${String(em).padStart(2, '0')} ${eampm}`;
              }
              const studentCount = session.totalStudents || session.group?.students?.length || 0;
              
              // Allow attendance for Active, Ended, and today's Scheduled sessions
              const isAttendable = true; 
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
                      "w-full h-12 flex items-center justify-center gap-2 transition-all",
                      "group-hover:shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.3)]"
                    )}
                    onClick={() => handleMakeAttendance(session)}
                  >
                    {isScheduled ? (
                      <>
                        <Zap className="w-4 h-4 text-[var(--ui-accent)]" />
                        Start & Mark
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Mark Attendance
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

      {isWizardOpen && (
        <AttendanceWizard 
          isOpen={isWizardOpen} 
          onClose={() => {
            setIsWizardOpen(false);
            setSelectedSession(null);
          }} 
          session={selectedSession} 
        />
      )}
    </div>
  );
};

export default AttendancePage;
