import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/stores";
import { useStudentDashboard } from "../queries/useStudentDashboard";
import { 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Activity, 
  CheckCircle, 
  GraduationCap, 
  MessageSquare,
  Wifi,
  Battery,
  User,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  MapPin
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge } from "../components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import { cn } from "../lib/utils";

// --- Sub-components ---

const CountdownCard: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const diff = differenceInSeconds(new Date(targetDate), new Date());
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / (3600 * 24)),
        h: Math.floor((diff % (3600 * 24)) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Activity className="w-12 h-12 text-emerald-500 animate-pulse mb-2" />
        <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">
          {t("student_dashboard.countdown.starting_now", "Starting Now")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: t("student_dashboard.countdown.days", "Days"), val: timeLeft.d },
        { label: t("student_dashboard.countdown.hours", "Hours"), val: timeLeft.h },
        { label: t("student_dashboard.countdown.minutes", "Minutes"), val: timeLeft.m },
        { label: t("student_dashboard.countdown.seconds", "Seconds"), val: timeLeft.s }
      ].map((unit, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-1">
            <span className="text-2xl font-sora font-semibold text-white">
              {String(unit.val).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{unit.label}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Dashboard ---

export const StudentDashboard: React.FC = () => {
  const { data, isLoading, error } = useStudentDashboard();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const studentLocation = useAuthStore(s => s.studentLocation);


  if (isLoading) {
    return (
      <div className="w-full h-[50vh] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ui-accent)] mb-4" />
        <p className="text-[var(--ui-accent)] font-bold uppercase text-xs animate-pulse">
          {t("student_dashboard.sync_neural", "Synchronizing Neural Environment...")}
        </p>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="p-6 max-w-4xl mx-auto font-sans">
        <Card className="p-8 border-red-500/20 bg-red-500/5 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-lg font-sora font-semibold text-white uppercase">
            {t("student_dashboard.identity_failed", "Identity Resolution Failed")}
          </h2>
          <p className="text-slate-400 mt-2">
            {error instanceof Error ? error.message : (data?.error?.message || t("student_dashboard.verify_error", "Your student records could not be verified."))}
          </p>
          <Button 
            className="mt-6 bg-red-500 hover:bg-red-400 text-white"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.data })}
          >
            {t("common.retry_validation", "Retry Validation")}
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;
  const { identity, progress, todaySession, nextSession, primaryAction, timeline } = data;

  const activeSession = todaySession || nextSession;

  // Check if session is tomorrow
  const isTomorrow = activeSession ? (() => {
    const now = new Date();
    const sessionDate = new Date(activeSession.scheduledAt);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return sessionDate.getDate() === tomorrow.getDate() && 
           sessionDate.getMonth() === tomorrow.getMonth() && 
           sessionDate.getFullYear() === tomorrow.getFullYear();
  })() : false;

  const [checklist, setChecklist] = useState([
    { id: 'internet', icon: <Wifi className="w-4 h-4" />, label: t("student_dashboard.prep.internet_check"), checked: false },
    { id: 'tasks', icon: <CheckCircle className="w-4 h-4" />, label: t("student_dashboard.prep.pending_tasks"), checked: false },
    { id: 'prepared', icon: <ShieldCheck className="w-4 h-4" />, label: t("student_dashboard.prep.fully_prepared"), checked: false },
    { id: 'work', icon: <BookOpen className="w-4 h-4" />, label: t("student_dashboard.prep.work_ready"), checked: false },
  ]);

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
  };

  return (
    <>
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 lg:p-10 space-y-8 animate-fade-in font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Region */}
        <motion.div initial="hidden" animate="visible" variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden relative z-10 shadow-lg shadow-emerald-500/10">
                {identity.avatarUrl ? (
                  <img src={identity.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-emerald-400" />
                )}
              </div>
              <div className="absolute -inset-2 bg-emerald-500/20 blur-xl rounded-full opacity-50 animate-pulse" />
            </div>
            
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-4 mb-1">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">
                  {t("common.student_operator", "Student Operator")}
                </p>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold">
                  {identity.groupName}
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-sora font-semibold text-white">
                {t("dashboard.welcome_back", "Welcome Back")}, {identity.name.split(' ')[0]}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /> {t("common.id", "ID")}: {identity.studentId}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>{t("common.level", "Level")} {identity.level}</span>
                {studentLocation && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="flex items-center gap-1.5 text-emerald-500/80"><MapPin className="w-3.5 h-3.5" /> {studentLocation}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("common.cairo_time")}</p>
                <p className="text-lg font-sora font-semibold text-white">{format(new Date(), "HH:mm")}</p>
             </div>
             <div className="h-10 w-[1px] bg-white/10" />
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t("student_dashboard.neural_link_active")}</span>
             </div>
          </div>
        </motion.div>

        {/* Session Tomorrow Reminder */}
        <AnimatePresence>
          {isTomorrow && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden"
            >
              <div className="card-aero p-6 bg-amber-500/10 border-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-glow shadow-amber-500/10">
                      <Clock className="w-7 h-7 text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-sora font-semibold text-white uppercase tracking-tight">
                        {t("student_dashboard.reminder_tomorrow")}
                      </h2>
                      <p className="text-xs font-medium text-amber-500/80 max-w-md">
                        {t("student_dashboard.prep.internet_check")} & {t("student_dashboard.prep.work_ready")}. 
                        {t("student_dashboard.prep.hardware_ready", " Ensure your equipment is ready for the session.")}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const el = document.getElementById('prep-checklist');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="h-12 px-8 bg-amber-500 text-white hover:bg-amber-600 border-none shadow-lg shadow-amber-500/20 font-bold uppercase text-[10px] tracking-widest shrink-0"
                  >
                    {t("student_dashboard.prep.start_prep", "Start Preparation")}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Mission Control */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Countdown Card */}
              <motion.div initial="hidden" animate="visible" variants={itemVariants} className="card-aero p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                <div className="relative z-10 space-y-4">
                  <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {t("student_dashboard.countdown.title")}
                  </h3>
                  
                  {activeSession ? (
                    <>
                      <CountdownCard targetDate={activeSession.scheduledAt} />
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("common.date")}</p>
                        <p className="text-sm font-semibold text-white">
                          {format(new Date(activeSession.scheduledAt), "EEEE, MMM d @ HH:mm")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center">
                       <p className="text-slate-500 text-xs font-bold uppercase">{t("student_dashboard.no_active_nodes")}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Instructor Card */}
              <motion.div initial="hidden" animate="visible" variants={itemVariants} className="card-aero p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-4 h-4" /> {t("group_sessions.instructor")}
                    </h3>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <User className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-sora font-semibold text-white leading-tight">{(identity as any).engineerName || "Assigned Instructor"}</h4>
                        <p className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest">{t("common.status_online", "System Engineer")}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline"
                    onClick={() => navigate('/chat')}
                    className="w-full mt-6 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest h-10"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-2" /> {t("student_dashboard.prep.go_to_chat")}
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Preparation Checklist */}
            <motion.div id="prep-checklist" initial="hidden" animate="visible" variants={itemVariants} className="card-aero p-8">
               <div className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t("student_dashboard.prep.title")}</h3>
                    <p className="text-[10px] font-medium text-slate-500">{t("dashboard.subtitle")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-500">{checklist.filter(i => i.checked).length} / {checklist.length}</span>
                    <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }}
                       />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left group",
                        item.checked 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5" 
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        item.checked ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-500"
                      )}>
                        {item.checked ? <CheckCircle className="w-5 h-5" /> : item.icon}
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wide flex-1">{item.label}</span>
                    </button>
                  ))}
               </div>

               <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">
                      {t("student_dashboard.prep.forgot_hw")}
                    </p>
                    <button 
                      onClick={() => navigate('/chat')}
                      className="text-[10px] font-bold text-white/40 hover:text-white flex items-center gap-1.5 transition-colors uppercase"
                    >
                      {t("student_dashboard.prep.go_to_chat")} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
               </div>
            </motion.div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t("nav.sessions"), icon: <Calendar className="w-5 h-5" />, path: "/sessions", color: "emerald" },
                  { label: t("nav.chat"), icon: <MessageSquare className="w-5 h-5" />, path: "/chat", color: "cyan" },
                  { label: t("nav.profile"), icon: <User className="w-5 h-5" />, path: "/profile", color: "purple" },
                  { label: t("common.help", "Support"), icon: <ShieldCheck className="w-5 h-5" />, path: "#", color: "slate" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => action.path !== "#" && navigate(action.path)}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", {
                      "bg-emerald-500/10 text-emerald-400": action.color === "emerald",
                      "bg-cyan-500/10 text-cyan-400": action.color === "cyan",
                      "bg-purple-500/10 text-purple-400": action.color === "purple",
                      "bg-slate-500/10 text-slate-400": action.color === "slate",
                    })}>
                      {action.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{action.label}</span>
                  </button>
                ))}
            </div>

          </div>

          {/* Right Sidebar: Progress & Timeline */}
          <motion.div initial="hidden" animate="visible" variants={itemVariants} className="col-span-1 space-y-6">
            
            {/* Progression Card */}
            <div className="card-aero p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{t("student_dashboard.course_trajectory")}</h3>
              
              <div className="flex items-end justify-between mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-sora font-semibold text-white leading-none">{progress.percentage.toFixed(0)}</span>
                  <span className="text-xl font-bold text-emerald-500">%</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("common.complete")}</p>
                  <p className="text-sm font-sora font-semibold text-white">{progress.completed} / {progress.total}</p>
                </div>
              </div>
              
              <div className="h-4 bg-white/5 rounded-full overflow-hidden w-full p-1 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 rounded-full relative"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t("student_dashboard.remaining")}</p>
                  <p className="text-xl font-sora font-semibold text-white">{progress.remaining}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t("student_dashboard.target_edge")}</p>
                  <p className="text-xl font-sora font-semibold text-emerald-400">S{progress.total}</p>
                </div>
              </div>
            </div>

            {/* Timeline View */}
            <div className="card-aero p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" /> {t("student_dashboard.recent_sessions")}
                </h3>
                <button onClick={() => navigate('/sessions')} className="text-[9px] font-bold text-emerald-500 uppercase hover:underline">
                  {t("common.all")}
                </button>
              </div>
              
              <div className="space-y-3">
                {timeline.slice(0, 4).map((session: any) => (
                  <div 
                    key={session.id} 
                    className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group" 
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all group-hover:scale-105", 
                      session.status === "Ended" 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-500'
                    )}>
                      {session.status === "Ended" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                        {t("common.session")} #{session.number}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{format(new Date(session.scheduledAt), "MMM d")}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-medium text-slate-600 truncate">{session.status}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default StudentDashboard;
