import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Users, 
  Zap, 
  Search, 
  ExternalLink, 
  SkipForward, 
  Loader2, 
  X, 
  ChevronRight,
  TrendingUp,
  Award,
  Filter
} from "lucide-react";
import { useInfiniteSessions, useSessionMutations } from "../queries/useSessionQueries";
import { Session } from "../types";
import { Card, Button, Badge } from "../components/ui";
import { AttendanceWizard } from "./attendance/AttendanceWizard";
import { cn, formatDateTo12h, getCairoDateStr } from "../lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { sounds } from "../lib/sounds";

const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [wizardSession, setWizardSession] = useState<Session | null>(null);
  const [skipSessionId, setSkipSessionId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string>("");

  // Ensure we fetch the exact day in Cairo
  const todayStr = getCairoDateStr();
  
  const { data, isLoading } = useInfiniteSessions({
    startDate: todayStr,
    endDate: todayStr,
    pageSize: 100
  });

  const { skipMutation } = useSessionMutations();

  const sessions = data?.pages.flatMap(p => p.items) || [];
  
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (searchQuery && !s.groupName?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sessions, searchQuery]);

  const liveSessions = filteredSessions.filter(s => s.status !== "Ended" && !s.isSkipped);
  const completedSessions = filteredSessions.filter(s => s.status === "Ended" || s.isSkipped);

  const stats = {
    total: sessions.length,
    live: liveSessions.length,
    completed: completedSessions.length
  };

  const handleMakeAttendance = (session: Session) => {
    sounds.playSessionLaunch();
    setWizardSession(session);
  };

  return (
    <div className="attendance-realm min-h-full flex flex-col bg-[var(--att-bg)] text-slate-200 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--att-ember)]/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header Section */}
      <header className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 shrink-0 relative z-20">
        <div className="space-y-3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--att-ember)]/10 border border-[var(--att-ember)]/20 flex items-center justify-center shadow-[var(--att-glow)]">
              <Award className="w-6 h-6 text-[var(--att-ember)]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
                Attendance <span className="text-[var(--att-ember)]">Command</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Mission Control · {todayStr}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Stats Pills */}
          <div className="hidden md:flex items-center gap-2 mr-4">
            <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase">Live</span>
                <span className="text-lg font-bold text-white leading-none">{stats.live}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase">Done</span>
                <span className="text-lg font-bold text-emerald-500 leading-none">{stats.completed}</span>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[var(--att-ember)] transition-colors" />
            <input
              type="text"
              placeholder="Locate group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--att-ember)]/30 focus:border-[var(--att-ember)] transition-all font-medium"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 sm:px-10 pb-12 custom-scrollbar relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-[var(--att-ember)] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[var(--att-ember)] animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Syncing Tactical Data...</p>
          </div>
        ) : sessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-[50vh] text-center"
          >
            <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 shadow-2xl">
              <Zap className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Quiet Day on the Frontline</h3>
            <p className="text-slate-500 text-sm max-w-sm font-medium">
              {searchQuery 
                ? "No tactical units match your search parameters."
                : "All systems clear. No missions scheduled for this rotation."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-16">
            {/* Live Sessions Section */}
            {liveSessions.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white font-black uppercase tracking-[0.2em] text-xs">
                    <span className="w-2 h-2 rounded-full bg-[var(--att-ember)] shadow-[0_0_10px_var(--att-ember)]" />
                    Live Deployments
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <Badge variant="outline" className="bg-[var(--att-ember)]/10 border-[var(--att-ember)]/20 text-[var(--att-ember)] font-black">
                    {liveSessions.length} PENDING
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {liveSessions.map((session, index) => (
                      <SessionCard 
                        key={session.id} 
                        session={session} 
                        index={index} 
                        onAction={() => handleMakeAttendance(session)}
                        onSkip={() => { setSkipSessionId(session.id); setSkipReason(""); }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Completed Today Section */}
            {completedSessions.length > 0 && (
              <section className="space-y-8 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-500 font-black uppercase tracking-[0.2em] text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Successful Extractions
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{completedSessions.length} COMPLETED</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {completedSessions.map((session) => (
                    <CompletedCard key={session.id} session={session} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {wizardSession && (
        <AttendanceWizard 
          isOpen={!!wizardSession}
          session={wizardSession}
          onClose={() => setWizardSession(null)}
        />
      )}

      {/* Skip Modal - Redesigned */}
      {skipSessionId && (
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setSkipSessionId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg"
            >
              <Card className="p-8 sm:p-10 border border-white/10 bg-[var(--att-surface-elevated)] shadow-2xl rounded-[2rem] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-transparent" />
                
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                    <SkipForward className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white font-display">Abort Mission?</h3>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Mark Session as Skipped</p>
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-8 leading-relaxed font-medium">
                  Aborting this session will preserve the current sequence number. The next deployment will attempt the same lecture.
                </p>

                <div className="space-y-4 mb-10">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Deployment Discrepancy</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Holiday", "Cadet Absence", "Engineer Unavailable", "Tech Issues"].map(reason => (
                      <button
                        key={reason}
                        onClick={() => { sounds.playHover(); setSkipReason(reason); }}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold border transition-all duration-300 text-start flex items-center justify-between group",
                          skipReason === reason
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                            : "bg-white/[0.02] border-white/10 text-slate-500 hover:bg-white/[0.05] hover:border-white/20"
                        )}
                      >
                        {reason}
                        <ChevronRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-all", skipReason === reason && "opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => setSkipSessionId(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                    Retreat
                  </Button>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        await skipMutation.mutateAsync({ id: skipSessionId, reason: skipReason || undefined });
                        sounds.playArchive();
                        toast.success("Mission aborted. Sequence preserved.");
                        setSkipSessionId(null);
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to abort mission.");
                      }
                    }}
                    disabled={skipMutation.isPending}
                    className="flex-[2] h-14 rounded-2xl bg-amber-600 hover:bg-amber-500 border-amber-500 text-white shadow-[0_10px_30px_rgba(217,119,6,0.2)] font-black uppercase tracking-widest text-[10px]"
                  >
                    {skipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Abort"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * SessionCard - Redesigned Premium Group Card
 */
const SessionCard: React.FC<{ 
  session: Session, 
  index: number, 
  onAction: () => void,
  onSkip: () => void
}> = ({ session, index, onAction, onSkip }) => {
  const isScheduled = session.status === "Scheduled";
  const startTimeStr = formatDateTo12h(new Date(session.scheduledAt));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
      className="group relative"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--att-ember)] to-[var(--att-crimson)] rounded-[2rem] opacity-0 group-hover:opacity-10 transition duration-500 blur-xl" />
      
      <Card className="relative h-full p-8 bg-[var(--att-surface)] border border-white/5 group-hover:border-white/10 group-hover:bg-[var(--att-surface-elevated)] transition-all duration-500 rounded-[2rem] flex flex-col overflow-hidden">
        {/* State Accent Strip */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isScheduled ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        )} />

        {/* Top Section */}
        <div className="flex justify-between items-start mb-8">
          <div className="min-w-0 pr-4">
            <h3 className="text-2xl font-black text-white mb-2 font-display truncate leading-tight">
              {session.groupName || "Unknown Unit"}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 text-slate-400">
                Lv. {session.groupLevel || 1}
              </Badge>
              <span className="text-[10px] font-black text-[var(--att-ember)] uppercase tracking-tighter">
                Session {session.sessionNumber || 1}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
             <div className="w-10 h-10 rounded-full border-2 border-white/5 flex items-center justify-center relative">
               <span className="text-[9px] font-black text-white">
                 {(session.sessionNumber || 1)}
               </span>
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle 
                    cx="20" cy="20" r="18" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="text-[var(--att-ember)]/20"
                    style={{ cx: "50%", cy: "50%" }}
                  />
                 <circle 
                    cx="20" cy="20" r="18" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="text-[var(--att-ember)]"
                    strokeDasharray="113"
                    strokeDashoffset={113 - (113 * ((session.sessionNumber || 1) / 12))} // Assuming 12 sessions avg
                    style={{ cx: "50%", cy: "50%" }}
                  />
               </svg>
             </div>
          </div>
        </div>

        {/* Tactical Info */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Deployment</span>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Clock className="w-3.5 h-3.5 text-[var(--att-ember)]" />
              {startTimeStr}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Cadets</span>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              {session.totalStudents || 0} Ready
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-auto space-y-3">
          <Button 
            onClick={onAction}
            className={cn(
              "w-full h-14 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-3 transition-all duration-500",
              isScheduled 
                ? "bg-[var(--att-gradient)] text-white shadow-[0_10px_30px_rgba(249,115,22,0.2)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] hover:-translate-y-1" 
                : "bg-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
            )}
          >
            {isScheduled ? (
              <>
                <TrendingUp className="w-4 h-4 animate-bounce" />
                Launch Session
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Open Intel Form
              </>
            )}
          </Button>
          
          <button 
            onClick={onSkip}
            className="w-full py-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-amber-500 transition-colors flex items-center justify-center gap-2"
          >
            <SkipForward className="w-3 h-3" />
            Bypass Sequence
          </button>
        </div>
      </Card>
    </motion.div>
  );
};

/**
 * CompletedCard - Small, muted card for finished sessions
 */
const CompletedCard: React.FC<{ session: Session }> = ({ session }) => {
  return (
    <Card className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.02] transition-all">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors truncate">
            {session.groupName}
          </h4>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {session.isSkipped ? "SKIPPED" : "COMPLETED"}
          </span>
        </div>
      </div>
      <Badge variant="outline" className="text-[8px] font-black border-white/5 text-slate-600">
        #{session.sessionNumber}
      </Badge>
    </Card>
  );
};

export default AttendancePage;
