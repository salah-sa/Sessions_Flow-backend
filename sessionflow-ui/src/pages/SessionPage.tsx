import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Play, 
  Square, 
  Users, 
  Clock, 
  ChevronLeft, 
  Settings, 
  Share2, 
  Save,
  MessageSquare,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { Card, Button, Badge, Modal } from "../components/ui";
import { AttendanceGrid } from "../components/attendance/Attendance";
import { useSession, useSessionMutations } from "../queries/useSessionQueries";
import { useSessionStore } from "../store/stores";
import { Session, AttendanceStatus, AttendanceRecord } from "../types";
import { useSignalR } from "../providers/SignalRProvider";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";

/** Safe wrapper around date-fns format to prevent RangeError crashes from invalid dates */
const safeFormat = (dateValue: string | Date | null | undefined, formatStr: string, fallback = "—"): string => {
  if (!dateValue) return fallback;
  try {
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

const SessionPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAttendanceRecords = useSessionStore((s) => s.setAttendanceRecords);
  const updateAttendanceRecord = useSessionStore((s) => s.updateAttendanceRecord);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const { on, invoke } = useSignalR();

  // Local Modal state
  const [isEndingOpen, setIsEndingOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [isConcluding, setIsConcluding] = useState(false);

  const { data: activeSession, isLoading: loading } = useSession(id!);
  const { startMutation, endMutation, updateAttendanceMutation } = useSessionMutations();
  
  const attendanceRecords = useSessionStore(state => state.attendanceRecords);
  
  useEffect(() => {
    if (activeSession?.notes) {
      setSessionNotes(activeSession.notes);
    }
    if ((activeSession as any)?.attendance) {
      setAttendanceRecords((activeSession as any).attendance);
    }
  }, [activeSession, setAttendanceRecords]);

  // Join/Leave SignalR group
  useEffect(() => {
    if (!id) return;
    invoke("JoinSession", id);
    return () => {
      invoke("LeaveSession", id);
    };
  }, [id, invoke]);

  // Real-time updates handled globally via SignalRProvider

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession?.status === "Active" && activeSession.startedAt) {
      interval = setInterval(() => {
        const start = new Date(activeSession.startedAt!).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
        
        setElapsedTime(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!activeSession) return;
    try {
      await startMutation.mutateAsync(activeSession.id);
      toast.success(t("sessions.start_success"));
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    const recordList = Object.values(attendanceRecords);
    const hasUnmarked = recordList.some(r => r.status === "Unmarked");
    
    if (hasUnmarked) {
      toast.error(t("sessions.mark_attendance_error"));
      return;
    }

    setIsConcluding(true);
    try {
      await endMutation.mutateAsync({ id: activeSession.id, notes: sessionNotes });
      setIsEndingOpen(false);
      toast.success(t("sessions.end_success"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    } finally {
      setIsConcluding(false);
    }
  };

  const handleMarkAttendance = async (studentId: string, status: AttendanceStatus) => {
    if (!activeSession || activeSession.status !== "Active") {
      toast.error(t("sessions.attendance_only_active"));
      return;
    }

    try {
      const record = { studentId, status, sessionId: activeSession.id };
      await updateAttendanceMutation.mutateAsync({ id: activeSession.id, records: [record] });
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-950/50 backdrop-blur-md">
      <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!activeSession && !id) return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in opacity-50">
       <Users className="w-16 h-16 text-slate-800" />
       <div className="text-center">
         <h2 className="text-xl font-sora font-extrabold text-white uppercase tracking-tight">{t("sessions.select_active")}</h2>
         <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">{t("sessions.select_active_subtitle")}</p>
       </div>
       <Button onClick={() => navigate("/dashboard")} variant="outline" className="border-white/5 bg-white/5">{t("common.back_home")}</Button>
    </div>
  );

  if (!activeSession) return (
    <div className="h-full flex items-center justify-center text-red-500">{t("common.not_found")}</div>
  );

  const students = (activeSession as any).students || [];
  const records = Object.values(attendanceRecords);

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in relative overflow-hidden">
      {/* Session Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-3xl sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-3">
              {activeSession.groupName || (activeSession as any).group?.name}
              <div className={cn(
                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                activeSession.status === "Active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                activeSession.status === "Ended" ? "bg-slate-800 border-white/5 text-slate-400" :
                "bg-brand-500/10 border-brand-500/20 text-brand-400"
              )}>
                {activeSession.status === "Active" ? t("sessions.status_live") : activeSession.status === "Ended" ? t("sessions.status_archived") : t("sessions.status_standby")}
              </div>
            </h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 opacity-80">
              <Clock className="w-3.5 h-3.5 text-brand-400" /> 
              {safeFormat(activeSession.scheduledAt, "EEEE - d MMM yyyy - hh:mm a")}
              {(activeSession as any).sessionNumber && (
                <span className="text-brand-500">
                   • {t("sessions.session_orbital")} {(activeSession as any).sessionNumber}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           {activeSession.status === "Active" && (
             <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">{t("sessions.live_duration")}</p>
                <p className="text-2xl font-sora font-black text-white tabular-nums tracking-tighter shadow-glow-emerald">{elapsedTime}</p>
             </div>
           )}

           <div className="flex gap-3 items-center">
             {activeSession.status === "Scheduled" ? (
               <div className="flex items-center gap-4">
                 {!(activeSession as any).canStart && (
                   <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-3 py-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
                      {t("sessions.locked_standby")}
                   </span>
                 )}
                 <button 
                   onClick={handleStartSession} 
                   disabled={!(activeSession as any).canStart}
                   className={cn(
                     "h-12 px-8 rounded-xl font-black tracking-[0.2em] uppercase text-[10px] transition-all flex items-center gap-3",
                     (activeSession as any).canStart 
                        ? "bg-emerald-500 text-black shadow-glow shadow-emerald-500/20 hover:scale-105" 
                        : "bg-slate-900 text-slate-700 opacity-50 cursor-not-allowed border border-white/5"
                   )}
                 >
                   <Play className="w-4 h-4 fill-current" /> {t("sessions.start")}
                 </button>
               </div>
             ) : activeSession.status === "Active" ? (
               <button onClick={() => setIsEndingOpen(true)} className="bg-red-500 text-white h-12 px-8 rounded-xl shadow-glow shadow-red-500/20 font-black tracking-[0.2em] uppercase text-[10px] flex items-center gap-3 hover:scale-105 transition-all">
                 <Square className="w-4 h-4 fill-current" /> {t("sessions.end")}
               </button>
             ) : (
               <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {t("sessions.node_locked")}
                  </div>
               </div>
             )}
             <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
               <Settings className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
           {/* Section Header */}
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Users className="w-5 h-5 text-brand-500" />
                    {t("sessions.roster_title")}
                 </h2>
                 <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest ps-8">{t("sessions.roster_subtitle")}</p>
              </div>
              <div className="flex gap-3">
                 <button className="btn-ghost h-9 px-4 rounded-xl text-[9px] font-black uppercase border border-white/5">
                    <Save className="w-3.5 h-3.5 me-2" /> {t("sessions.force_save")}
                 </button>
              </div>
           </div>

           <AttendanceGrid 
             students={students}
             records={attendanceRecords}
             onMarkStatus={handleMarkAttendance}
             disabled={!(activeSession as any).isEditable}
           />
        </div>

        {/* Sidebar Info Panel */}
        <div className="w-80 border-s border-white/5 bg-slate-900/40 p-8 space-y-8 flex flex-col overflow-y-auto custom-scrollbar backdrop-blur-md">
           {/* Tactical Radar Scanner HUD */}
           <div className="card-base p-6 bg-slate-950/80 border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group/radar flex flex-col items-center">
              {/* Radar Grid & Sweep */}
              <div className="w-48 h-48 rounded-full border border-emerald-500/30 relative flex items-center justify-center overflow-hidden mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                 {/* Concentric Rings */}
                 <div className="absolute w-[66%] h-[66%] rounded-full border border-emerald-500/20" />
                 <div className="absolute w-[33%] h-[33%] rounded-full border border-emerald-500/10" />
                 <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                 <div className="absolute h-full w-[1px] bg-emerald-500/20" />
                 
                 {/* Sweeper */}
                 <div className="absolute w-1/2 h-1/2 bottom-1/2 right-1/2 origin-bottom-right animate-[spin_4s_linear_infinite] pointer-events-none">
                    <div className="w-full h-full bg-[conic-gradient(from_180deg_at_100%_100%,transparent_0deg,rgba(16,185,129,0.4)_90deg,rgba(16,185,129,0.8)_100deg)] rounded-tl-full border-r-2 border-emerald-400" />
                 </div>

                 {/* Simulated Targets (Students) */}
                 {records.slice(0, 12).map((record, i) => {
                    // Generate pseudo-random positions based on ID
                    const angle = (i * 137.5) % 360;
                    const radius = 20 + ((i * 17) % 30);
                    const isAbsent = record.status === "Absent";
                    return (
                      <div 
                        key={record.studentId}
                        className={cn(
                          "absolute w-1.5 h-1.5 rounded-full shadow-glow",
                          isAbsent ? "bg-red-500 animate-ping" : "bg-emerald-400"
                        )}
                        style={{
                           transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`
                        }}
                      />
                    );
                 })}
              </div>

              {/* Status Metrics */}
              <div className="w-full space-y-4">
                 <p className="text-[9px] font-black tracking-[0.3em] uppercase text-emerald-500 border-b border-white/5 pb-2">{t("sessions.telemetry_title")}</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t("sessions.label_present")}</p>
                       <p className="text-2xl font-sora font-black text-emerald-400 tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                          {records.filter(r => r.status === "Present" || r.status === "Late").length}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t("sessions.label_absent")}</p>
                       <p className="text-2xl font-sora font-black text-red-500 tabular-nums drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                          {records.filter(r => r.status === "Absent").length}
                       </p>
                    </div>
                 </div>
                 
                 {/* Integrity Bar */}
                 <div className="space-y-2 pt-3">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                       <span>{t("sessions.label_performance")}</span>
                       <span className="text-emerald-500">
                          {Math.round((records.filter(r => r.status === "Present" || r.status === "Late").length / (students.length || 1)) * 100)}%
                       </span>
                    </div>
                    <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                       <div 
                          className="h-full bg-emerald-500 shadow-glow transition-all duration-1000 relative" 
                          style={{ width: `${(records.filter(r => r.status === "Present" || r.status === "Late").length / (students.length || 1)) * 100}%` }}
                       >
                          <div className="absolute inset-0 bg-white/50 w-full h-full animate-[shimmer_2s_infinite]" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Deployment Notes */}
           <div className="flex-1 flex flex-col space-y-4 min-h-0">
               <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{t("sessions.deployment_log")}</span>
               </div>
               <div className="flex-1 card-base p-0 bg-slate-950/50 border-white/5 overflow-hidden flex flex-col">
                  {activeSession.status === "Active" ? (
                    <textarea 
                      className="flex-1 w-full bg-transparent p-4 text-xs font-medium text-slate-300 focus:outline-none resize-none placeholder:text-slate-800"
                      placeholder={t("sessions.observations_placeholder")}
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                    />
                  ) : (
                    <div className="flex-1 p-4 text-xs text-slate-500 leading-relaxed font-medium overflow-y-auto">
                       {activeSession.notes || t("sessions.no_log_entries")}
                    </div>
                  )}
                  <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                     <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{t("sessions.auto_save")}</span>
                     <Save className="w-3 h-3 text-slate-800" />
                  </div>
               </div>
           </div>

           {/* Tactical Information */}
           <div className="space-y-3">
              <div className="flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-slate-700" />
                 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("sessions.system_info")}</span>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase">{t("sessions.latency")}</span>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{t("sessions.latency_value")}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase">{t("sessions.encryption")}</span>
                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">{t("sessions.encryption_value")}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* End Session Modal */}
      <Modal 
        isOpen={isEndingOpen} 
        onClose={() => setIsEndingOpen(false)} 
        title={t("sessions.modal.end_title")}
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-xs text-amber-500 font-bold uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle className="w-4 h-4" /> {t("sessions.modal.report_req")}
                </p>
                <div className="flex gap-2">
                   <Badge variant="success" className="text-[9px] px-1.5 py-0">
                     {t("sessions.modal.present_count", { count: Object.values(attendanceRecords).filter(r => r.status === "Present" || r.status === "Late").length })}
                   </Badge>
                   <Badge variant="danger" className="text-[9px] px-1.5 py-0">
                     {t("sessions.modal.absent_count", { count: Object.values(attendanceRecords).filter(r => r.status === "Absent").length })}
                   </Badge>
                </div>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed">
                {t("sessions.modal.report_desc")}
             </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ms-1">{t("sessions.modal.notes_label")}</label>
            <textarea 
              className="w-full min-h-[120px] rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
              placeholder={t("sessions.modal.notes_placeholder")}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
             <Button variant="ghost" className="flex-1" onClick={() => setIsEndingOpen(false)}>{t("sessions.modal.abort")}</Button>
             <Button 
                disabled={isConcluding} 
                variant="danger" 
                className="flex-1 h-12 shadow-red-500/20" 
                onClick={handleEndSession}
              >
                {isConcluding ? <Loader2 className="w-5 h-5 animate-spin" /> : t("sessions.modal.conclude")}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionPage;
