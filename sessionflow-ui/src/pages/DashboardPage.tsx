import React, { useState, useEffect, useRef, useMemo, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  Target,
  Bell,
  Plus,
  Loader2,
  Play,
  Settings,
  BarChart3,
  Activity,
  Search,
  AlertCircle,
  PlusCircle,
  ShieldAlert,
  Rocket,
  Zap,
  MoreHorizontal,
  FileText,
  GraduationCap,
  CheckCircle,
  RefreshCcw,
  AlertTriangle,
  BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, Button, Badge, Modal, Input, Skeleton, EmptyState } from "../components/ui";
import { cn } from "../lib/utils";
import { useAuthStore, useAppStore } from "../store/stores";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalR } from "../providers/SignalRProvider";
import { UserRole, Session } from "../types";
import { useDashboardSummary } from "../queries/useDashboardQueries";
import { useGroups } from "../queries/useGroupQueries";
import { useSessionMutations } from "../queries/useSessionQueries";
import { queryKeys } from "../queries/keys";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useChatRecovery } from "../hooks/useChatRecovery";
import { useHoverSound } from "../hooks/useHoverSound";
import StudentDashboard from "./StudentDashboard";

/* TAILWIND JIT SAFELIST
  from-emerald-500 from-amber-500 from-brand-500 from-cyan-500
  text-emerald-400 text-amber-400 text-brand-400 text-cyan-400
  bg-emerald-500 bg-amber-500 bg-brand-500 bg-cyan-500
  border-emerald-500/30 border-amber-500/30 border-brand-500/30 border-cyan-500/30
  shadow-emerald-500/10 shadow-amber-500/10 shadow-brand-500/10 shadow-cyan-500/10
*/

// ═══════════════════════════════════════════════
// Phase 9: Section-level Error Boundary
// ═══════════════════════════════════════════════
interface SectionBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  onRetry?: () => void;
}
interface SectionBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class SectionErrorBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Dashboard/${this.props.sectionName}]`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card-aero p-6 flex flex-col items-center justify-center gap-4 min-h-[120px]">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-widest">{this.props.sectionName || 'Section'} Error</span>
          </div>
          <p className="text-[10px] text-slate-500 text-center max-w-xs">{this.state.error?.message}</p>
          {this.props.onRetry && (
            <button 
              onClick={() => { this.setState({ hasError: false, error: null }); this.props.onRetry?.(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
            >
              <RefreshCcw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════
// Phase 9: Memoized Sub-Components
// ═══════════════════════════════════════════════
const CairoClock: React.FC = React.memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{format(time, "HH:mm:ss")}</>;
});

// Mini Sparkline SVG component (matches mockup style)
const Sparkline: React.FC<{ data?: number[], color?: string, id?: string }> = React.memo(({ data = [30, 50, 40, 70, 55, 80, 65, 90], color = "#10b981", id = "default" }) => {
  const max = Math.max(...data, 1);
  const normalized = data.map(v => (v / max) * 80 + 10);
  const points = normalized.map((v, i) => `${(i / (normalized.length - 1)) * 100},${100 - v}`).join(" ");
  const areaPath = `M0,100 L${normalized.map((v, i) => `${(i / (normalized.length - 1)) * 100},${100 - v}`).join(" L")} L100,100 Z`;
  const gradientId = `spark-${id}`;
  
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="animate-sparkline"
        style={{ strokeDasharray: 200, strokeDashoffset: 0 }}
      />
    </svg>
  );
});

// Circular Progress Timer for Active Sessions
const CircularTimer: React.FC<{ startedAt: string, duration?: number }> = React.memo(({ startedAt, duration = 120 }) => {
  const [percent, setPercent] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diffMinutes = (now - start) / (1000 * 60);
      const p = Math.min((diffMinutes / duration) * 100, 100);
      setPercent(p);
      const totalSeconds = Math.floor((now - start) / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, duration]);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="transparent" stroke="currentColor" strokeWidth="3" className="text-slate-800/30" />
        <circle 
          cx="48" cy="48" r={radius} 
          fill="transparent" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="text-emerald-400 transition-all duration-1000 ease-linear" 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[13px] font-sora font-black text-white tabular-nums leading-none">{elapsed}</span>
        <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">Live</span>
      </div>
    </div>
  );
});

// Donut Chart (matches "Project Distribution" from mockup)
const DonutChart: React.FC<{ segments: { label: string, value: number, color: string }[] }> = React.memo(({ segments }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulativePercent = 0;
  
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
            const percent = (seg.value / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -(cumulativePercent);
            cumulativePercent += percent;
            return (
              <circle 
                key={i}
                cx="21" cy="21" r="15.5" 
                fill="transparent"
                stroke={seg.color}
                strokeWidth="3.5"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 4px ${seg.color}40)` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-sora font-black text-white">{total}</span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color, boxShadow: `0 0 8px ${seg.color}60` }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const LaunchpadHero: React.FC = () => {
  const playHover = useHoverSound();
  return (
    <div 
      onMouseEnter={playHover}
      className="relative overflow-hidden card-aero p-8 lg:p-12 mb-8 group hover:shadow-emerald-500/10 transition-all duration-700"
    >
      <div className="relative z-10 max-w-2xl">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl lg:text-5xl font-sora font-black text-white mb-4 tracking-tight uppercase"
        >
          Ready for <span className="text-emerald-400">Initialization</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-lg mb-8 font-medium leading-relaxed"
        >
          Your operational environment is primed. Launch your first group to begin 
          synchronizing sessions, tracking student progress, and scaling your educational output.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          <Link to="/groups" className="btn-primary flex items-center gap-3 px-8 group">
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Establish First Node
          </Link>
          <div className="px-6 py-3 rounded-xl border border-white/5 bg-white/5 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-500/40" />
            System Standby Mode
          </div>
        </motion.div>
      </div>
      
      {/* Cinematic Perspective Decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full pointer-events-none overflow-hidden opacity-20 lg:opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/20 blur-[80px] rounded-full animate-breathe" />
        <div className="absolute top-0 right-0 p-8 flex items-center justify-center h-full">
          <Rocket className="w-48 h-48 text-emerald-500/10 rotate-12 transition-transform duration-1000 group-hover:translate-x-4 group-hover:-translate-y-4" />
        </div>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  useChatRecovery(); // FIX-3: Auto-recover from auth state corruption
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { on } = useSignalR();
  const playHover = useHoverSound();
  const queryClient = useQueryClient();
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const groupsFilter = useMemo(() => ({ pageSize: 100 }), []);
  const { data: groupsData, isLoading: groupsLoading } = useGroups(groupsFilter);
  const { createMutation } = useSessionMutations();

  const groups = groupsData?.items || [];
  const loading = summaryLoading || groupsLoading;
  const fetchError = (summaryError as any)?.message || null;
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        setShowSkeleton((prev) => (prev ? prev : true));
      }, 150);
    } else {
      setShowSkeleton((prev) => (prev ? false : prev));
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [loading]);

  // Phase 8: Role-based flags
  const userRole: any = user?.role || "Engineer";
  const isAdmin = userRole === "Admin";
  const isEngineer = userRole === "Engineer";
  const isStudent = userRole === "Student";
  const canSeeRevenue = isAdmin;
  const canSeeAdminMetrics = isAdmin;
  const canCreateSession = isAdmin || isEngineer;

  // Animation Refs
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const insightsRef = useRef(null);
  const timelineRef = useRef(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSessionGroupId, setNewSessionGroupId] = useState("");
  const [newSessionDate, setNewSessionDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const submitting = createMutation.isPending;

  // GSAP Animations
  useEffect(() => {
    if (!loading) {
      const g = gsap;
      
      // Initialize states
      g.set(".stat-card, .student-group-card", { opacity: 0, y: 30 });
      g.set(".timeline-item", { opacity: 0, x: -20 });
      if (insightsRef.current) g.set(insightsRef.current, { opacity: 0, y: 20 });
      if (headerRef.current) g.set(headerRef.current, { opacity: 0, y: -10 });

      // Header Animation
      if (headerRef.current) {
        g.to(headerRef.current, {
          y: 0, opacity: 1, duration: 0.8, ease: "expo.out"
        });
      }

      // Cards Animation (Unified for all roles)
      const cardTargets = document.querySelectorAll(".stat-card, .student-group-card, .student-stats-header");
      if (cardTargets.length > 0) {
        g.to(cardTargets, {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "back.out(1.7)", delay: 0.2
        });
      }

      // Insights/Analytics Animation
      if (insightsRef.current) {
        g.to(insightsRef.current, {
          y: 0, opacity: 1, duration: 1, ease: "power2.out", delay: 0.5
        });
      }

      // Timeline Animation
      const timelineItems = document.querySelectorAll(".timeline-item");
      if (timelineItems.length > 0) {
        g.to(timelineItems, {
          x: 0, opacity: 1, stagger: 0.05, duration: 0.6, ease: "power2.out", delay: 0.8
        });
      }
    }
  }, [loading]);

  // Real-time updates handled globally via SignalRProvider

  const todaySessions = summaryData?.todayTimeline || [];
  const recentActivity = summaryData?.recentActivity || [];

  const handleCreateSession = async () => {
    if (!newSessionGroupId || !newSessionDate) return;
    try {
      const session = await createMutation.mutateAsync({
        groupId: newSessionGroupId,
        scheduledAt: new Date(newSessionDate).toISOString()
      });
      toast.success(t("dashboard.modal.success"));
      setIsCreateOpen(false);
      navigate(`/sessions/${session.id}`);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  // Level distribution for donut chart
  const levelSegments = useMemo(() => [
    { label: "Level 1", value: groups.filter(g => g.level === 1).length, color: "#10b981" },
    { label: "Level 2", value: groups.filter(g => g.level === 2).length, color: "#8b5cf6" },
    { label: "Level 3", value: groups.filter(g => g.level === 3).length, color: "#06b6d4" },
    { label: "Level 4", value: groups.filter(g => g.level === 4).length, color: "#f59e0b" },
  ].filter(s => s.value > 0), [groups]);

  // Phase 8: Role-filtered stat cards
  const stats = useMemo(() => {
    const allStats = [
      { 
        id: "groups",
        label: t("dashboard.stats.total_groups"), 
        value: summaryData?.totalGroups || 0, 
        trend: `${summaryData?.completedGroups || 0} ${t("dashboard.stats.completed", "Completed")}`,
        sparkData: summaryData?.weeklyTrend || [0,0,0,0,0,0,0,0],
        icon: Users, 
        color: "#10b981",
        link: "/groups",
        roles: ["Admin", "Engineer"] as UserRole[]
      },
      { 
        id: "students",
        label: t("dashboard.stats.total_students", "Total Students"), 
        value: summaryData?.totalStudents || 0, 
        trend: t("dashboard.stats.enrolled", "Enrolled"),
        sparkData: summaryData?.studentGrowth || [0,0,0,0,0,0,0,0],
        icon: GraduationCap, 
        color: "#8b5cf6",
        link: "/students",
        roles: ["Admin", "Engineer"] as UserRole[]
      },
      { 
        id: "revenue",
        label: t("dashboard.stats.revenue", "Total Revenue"), 
        value: `EGP ${(summaryData?.totalRevenue || 0).toLocaleString()}`, 
        trend: `EGP ${(summaryData?.monthlyAttendance?.revenue || 0).toLocaleString()} ${t("dashboard.stats.this_month", "This Month")}`,
        sparkData: summaryData?.weeklyTrend?.map((v: number) => Math.max(v * 200, 1)) || [0,0,0,0,0,0,0,0],
        icon: TrendingUp, 
        color: "#10b981",
        link: "/history",
        roles: ["Admin"] as UserRole[]
      },
      { 
        id: "active",
        label: t("dashboard.stats.active_sessions"), 
        value: summaryData?.activeSessions || 0, 
        trend: t("dashboard.stats.live", "Live Now"),
        sparkData: summaryData?.weeklyTrend || [0,0,0,0,0,0,0,0],
        icon: Activity, 
        color: "#f59e0b",
        link: "/timetable",
        roles: ["Admin", "Engineer", "Student"] as UserRole[]
      },
      { 
        id: "today",
        label: t("dashboard.stats.today_sessions"), 
        value: summaryData?.todaySessions || 0, 
        trend: t("dashboard.stats.today", "Today"),
        sparkData: summaryData?.weeklyTrend || [0,0,0,0,0,0,0,0],
        icon: Calendar, 
        color: "#06b6d4",
        link: "/timetable",
        roles: ["Admin", "Engineer", "Student"] as UserRole[]
      },
      { 
        id: "upcoming",
        label: t("dashboard.stats.upcoming_sessions", "Upcoming"), 
        value: summaryData?.upcomingSessions || 0, 
        trend: t("dashboard.stats.scheduled", "Scheduled"),
        sparkData: summaryData?.weeklyTrend || [0,0,0,0,0,0,0,0],
        icon: Clock, 
        color: "#3b82f6",
        link: "/timetable",
        roles: ["Admin", "Engineer", "Student"] as UserRole[]
      },
      { 
        id: "completed",
        label: t("dashboard.stats.completed_sessions", "All Completed"), 
        value: summaryData?.completedSessionsAllTime || 0, 
        trend: t("dashboard.stats.all_time", "All Time"),
        sparkData: summaryData?.attendanceTrend || [0,0,0,0,0,0,0,0],
        icon: CheckCircle, 
        color: "#10b981",
        link: "/history",
        roles: ["Admin", "Engineer"] as UserRole[]
      },
    ];
    // Filter by role
    return allStats.filter(s => {
      // If student, ONLY show active/today/upcoming if they are relevant (handled by backend or filtered logic)
      // Actually, plan says remove system-wide stats. We'll keep these three as they are "operationally" relevant to the student's schedule.
      return s.roles.includes(userRole);
    });
  }, [summaryData, t, userRole]);

  // Phase 9: Error state with retry
  if (!loading && fetchError) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="card-aero p-10 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-sora font-black text-white uppercase tracking-widest">{t("error_boundary.title")}</h2>
            <p className="text-sm text-slate-400">{fetchError}</p>
          </div>
          <button 
            onClick={() => { queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }); }}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500/25 transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> {t("error_boundary.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <div className="p-6 w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // FIX-I: Dedicated rendering for Student role
  if (isStudent) {
    return <StudentDashboard />;
  }

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 lg:p-10 space-y-8 animate-fade-in">
      {/* Welcome & Launchpad Context */}
      {summaryData && summaryData.totalGroups === 0 ? (
        <LaunchpadHero />
      ) : (
        <div ref={headerRef} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="space-y-1">
            <h1 className="page-header-title text-3xl lg:text-4xl">
              {t("dashboard.welcome")}, {user?.name?.split(' ')[0] || user?.email?.split('@')[0]}
            </h1>
            <p className="page-header-subtitle">
              {t("dashboard.subtitle")}
            </p>
          </div>
          
           <div className="flex items-center gap-3">
             <div className="card-aero px-4 py-2.5 flex items-center gap-3">
               <div className="p-2 bg-emerald-500/15 rounded-lg">
                 <Clock className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="flex flex-col">
                 <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest leading-none mb-0.5">Cairo Time</p>
                 <p className="text-lg font-sora font-black text-white tracking-tighter tabular-nums leading-none">
                   <CairoClock />
                 </p>
               </div>
             </div>
             
             {/* Phase 8: Only Admin/Engineer can create sessions */}
             {canCreateSession && (
               <button 
                 onClick={() => setIsCreateOpen(true)} 
                 className="h-11 px-5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center gap-2 whitespace-nowrap"
               >
                 <Plus className="w-4 h-4" /> {t("dashboard.quick_schedule.button")}
               </button>
             )}
             
             {/* Phase 8: Student role badge */}
             {isStudent && (
               <div className="card-aero px-4 py-2.5 flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-violet-400" />
                 <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">{t("dashboard.student_view", "Student View")}</span>
               </div>
             )}
           </div>
        </div>
      )}

      {/* Phase 9: Stat Cards wrapped in Error Boundary */}
      <SectionErrorBoundary sectionName="Stats" onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })}>
        <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <div 
              key={stat.id} 
              onMouseEnter={playHover}
              className="stat-card card-aero p-6 relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
              onClick={() => navigate(stat.link)}
            >
              {/* Glow accent at top */}
              <div 
                className="absolute top-0 start-[20%] end-[20%] h-px opacity-60"
                style={{ backgroundColor: stat.color, boxShadow: `0 0 12px ${stat.color}80` }}
              />
              
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                  <p className="text-4xl font-sora font-black text-white tracking-tighter tabular-nums leading-none">
                    {stat.value}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              
              {/* Sparkline */}
              <div className="h-10 mb-3">
                <Sparkline data={stat.sparkData} color={stat.color} id={stat.id} />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: stat.color }}>{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionErrorBoundary>

      {/* Phase 8+9: Analytics Section — role gated + error bounded */}
      {!isStudent && (
      <SectionErrorBoundary sectionName="Analytics" onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })}>
      <div ref={insightsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Analytics (Attendance Ring + Real Metrics) */}
        <div className="lg:col-span-1 card-aero p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-emerald-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              {t("dashboard.sessions_activity", "Analytics")}
            </h2>
          </div>
          
          {/* Attendance Ring */}
          <div className="flex flex-col items-center gap-5 mb-8">
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <circle cx="72" cy="72" r="60" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-800/30" />
                <circle cx="72" cy="72" r="60" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="377" strokeDashoffset={377 * (1 - (summaryData?.attendanceRateOverall || 0))} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-sora font-black text-white leading-none">{Math.round((summaryData?.attendanceRateOverall || 0) * 100)}%</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mt-1">{t("dashboard.insights.avg_rate")}</span>
              </div>
            </div>
          </div>

          {/* Progress Metrics */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest items-baseline">
                <span className="text-slate-400">{t("dashboard.insights.completion_rate", "Completion Rate")}</span>
                <span className="text-cyan-400 font-sora">{Math.round((summaryData?.completionRate || 0) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.round((summaryData?.completionRate || 0) * 100)}%` }} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest items-baseline">
                <span className="text-slate-400">{t("dashboard.stats.avg_duration", "Avg Duration")}</span>
                <span className="text-violet-400 font-sora">{summaryData?.avgSessionDuration || 0} min</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.4)] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(((summaryData?.avgSessionDuration || 0) / 90) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Balance */}
        <div className="card-aero p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em]">
              {t("dashboard.monthly_attendance", "This Month")}
            </h2>
            <span className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
          </div>
          
          {/* Present vs Absent Visual */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-sora font-black text-emerald-400">{summaryData?.monthlyAttendance?.present || 0}</p>
              <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">{t("dashboard.present", "Present")}</p>
            </div>
            <div className="flex-1 text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-sora font-black text-red-400">{summaryData?.monthlyAttendance?.absent || 0}</p>
              <p className="text-[9px] font-black text-red-500/60 uppercase tracking-widest mt-1">{t("dashboard.absent", "Absent")}</p>
            </div>
          </div>

          {/* Attendance Rate Bar */}
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">{t("dashboard.insights.avg_rate", "Attendance Rate")}</span>
              <span className="text-emerald-400 font-sora">{Math.round((summaryData?.monthlyAttendance?.attendanceRate || 0) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800/40 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.round((summaryData?.monthlyAttendance?.attendanceRate || 0) * 100)}%`,
                  background: 'linear-gradient(90deg, #10b981, #06b6d4)'
                }} 
              />
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.sessions_count", "Sessions")}</p>
              <p className="text-lg font-sora font-black text-white mt-1">{summaryData?.monthlyAttendance?.sessionCount || 0}</p>
            </div>
            {canSeeRevenue && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.stats.revenue", "Revenue")}</p>
              <p className="text-lg font-sora font-black text-white mt-1">EGP {(summaryData?.monthlyAttendance?.revenue || 0).toLocaleString()}</p>
            </div>
            )}
          </div>
        </div>

        {/* Group Distribution Donut */}
        <div className="card-aero p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em]">
              {t("dashboard.insights.groups_by_level")}
            </h2>
            <span className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">{t("dashboard.active_only", "Active Only")}</span>
          </div>
          <DonutChart segments={levelSegments} />
          
          {/* Revenue by Level Bars — Admin only */}
          {canSeeRevenue && (summaryData?.revenueByLevel?.length || 0) > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{t("dashboard.revenue_by_level", "Revenue by Level")}</p>
              {summaryData?.revenueByLevel?.map(item => {
                const maxRevenue = Math.max(...(summaryData?.revenueByLevel?.map(r => r.total) || [1]));
                const levelColors = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b'];
                const color = levelColors[(item.level - 1) % 4];
                return (
                  <div key={item.level} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">L{item.level}</span>
                      <span style={{ color }} className="font-sora">EGP {item.total.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(item.total / maxRevenue) * 100}%`, backgroundColor: color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </SectionErrorBoundary>
      )}

      {/* Phase 8: Student-Scoped Group Cards Grid */}
      {isStudent && (
        <SectionErrorBoundary sectionName="My Groups">
          <div className="space-y-6">
            <div className="flex items-center justify-between student-stats-header">
              <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <Rocket className="w-4 h-4 text-emerald-500" />
                {t("dashboard.my_groups", "My Enrolled Groups")}
              </h2>
              <Badge variant="glow">{groups.length} {t("dashboard.active_groups", "Active")}</Badge>
            </div>

            {groups.length === 0 ? (
              <EmptyState 
                icon={GraduationCap}
                title={t("dashboard.no_groups_title", "No Active Enrollments")}
                description={t("dashboard.no_groups_desc", "You are not currently enrolled in any active session groups. Contact your administrator if this is an error.")}
                className="card-aero py-20"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => {
                  const completed = group.currentSessionNumber - 1;
                  const total = group.totalSessions;
                  const remaining = Math.max(total - completed, 0);
                  const progress = total > 0 ? (completed / total) * 100 : 0;
                  const levelColors = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b'];
                  const color = levelColors[(group.level - 1) % 4] || '#10b981';

                  return (
                    <motion.div
                      key={group.id}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/groups/${group.id}/sessions`)}
                      className="card-aero p-8 relative overflow-hidden group/card cursor-pointer student-group-card"
                    >
                      {/* Decorative Background Element */}
                      <div 
                        className="absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 transition-all duration-500 group-hover/card:opacity-40" 
                        style={{ backgroundColor: color }} 
                      />

                      <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color }}>Level {group.level}</p>
                            <h3 className="text-xl font-sora font-black text-white uppercase tracking-tight group-hover/card:text-emerald-400 transition-colors">
                              {group.name}
                            </h3>
                          </div>
                          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                            <GraduationCap className="w-5 h-5 text-slate-500 group-hover/card:text-white transition-colors" />
                          </div>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.progress", "Current Progress")}</span>
                            <span className="text-lg font-sora font-black text-white tabular-nums">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1.5, ease: "expoOut" }}
                              className="h-full rounded-full"
                              style={{ 
                                backgroundColor: color,
                                boxShadow: `0 0 15px ${color}40`
                              }}
                            />
                          </div>
                        </div>

                        {/* Session Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.completed", "Completed")}</p>
                            <p className="text-base font-sora font-black text-white">{completed} <span className="text-[10px] text-slate-600">Sessions</span></p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.remaining", "Remaining")}</p>
                            <p className="text-base font-sora font-black text-amber-500">{remaining} <span className="text-[10px] text-slate-600">Sessions</span></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Clock className="w-3 h-3" /> {group.status}
                           </span>
                           <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest group-hover/card:translate-x-1 transition-transform">
                              {t("dashboard.view_details", "View Sessions")}
                              <ArrowRight className="w-3 h-3" />
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionErrorBoundary>
      )}

      {/* Top Groups Leaderboard — Admin/Engineer only */}
      {!isStudent && (summaryData?.topGroups?.length || 0) > 0 && (
        <SectionErrorBoundary sectionName="Leaderboard">
        <div className="card-aero p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="text-lg">🏆</span>
              {t("dashboard.top_groups", "Top Performing Groups")}
            </h2>
            <span className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">{t("dashboard.active_only", "Active Only")}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {summaryData?.topGroups?.map((group, idx) => {
              const completion = group.totalSessions > 0 ? (group.sessionsCompleted / group.totalSessions) * 100 : 0;
              const attColor = group.attendanceRate > 0.8 ? '#10b981' : group.attendanceRate > 0.6 ? '#f59e0b' : '#ef4444';
              const levelColors = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b'];
              const color = levelColors[(group.level - 1) % 4];
              
              return (
                <div 
                  key={group.id} 
                  className="card-aero p-5 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform group/g"
                  onClick={() => navigate(`/groups/${group.id}/sessions`)}
                >
                  {/* Rank badge */}
                  <div className="absolute top-3 end-3 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black"
                    style={{ backgroundColor: `${color}15`, color }}>
                    {idx + 1}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-[12px] font-black text-white uppercase tracking-tight truncate pe-8 group-hover/g:text-emerald-400 transition-colors">{group.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color }}>Level {group.level} • {group.studentCount} students</p>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-500">{group.sessionsCompleted}/{group.totalSessions}</span>
                        <span className="text-slate-400">{Math.round(completion)}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${completion}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    
                    {/* Attendance + Revenue */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[10px] font-black" style={{ color: attColor }}>{Math.round(group.attendanceRate * 100)}% att.</span>
                      {canSeeRevenue && <span className="text-[10px] font-sora font-bold text-slate-400">EGP {group.revenue.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </SectionErrorBoundary>
      )}

      {/* Phase 9: Timeline + Activity wrapped in Error Boundary */}
      <SectionErrorBoundary sectionName="Timeline" onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
        {/* Today's Timeline as Data Table */}
        <div ref={timelineRef} className="lg:col-span-2 card-aero p-0 overflow-hidden">
          <div className="flex items-center justify-between p-8 pb-0 mb-6">
            <div className="space-y-1">
              <h2 className="text-[13px] font-sora font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-500" />
                {t("dashboard.timeline.title")}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">{t("dashboard.timeline.subtitle", { date: format(new Date(), "EEEE, MMM dd") })}</p>
            </div>
            <button onClick={() => navigate("/timetable")} className="px-5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2 group/btn">
              {t("dashboard.timeline.go_to")} <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform rtl:rotate-180" />
            </button>
          </div>

          {/* Table Header */}
          <div className="px-8">
            <div className="grid grid-cols-5 gap-4 py-3 border-b border-emerald-500/10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Name</span>
              <span>Type</span>
              <span className="text-center">Status</span>
              <span>Scheduled</span>
              <span className="text-end">Action</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="px-8 pb-6">
            {todaySessions.length === 0 ? (
              <EmptyState 
                icon={Calendar}
                title={t("dashboard.timeline.empty", "No Sessions Today")}
                description="System indicates a clear schedule. Take this time to audit past sessions or prepare for upcoming ones."
                className="py-16"
              />
            ) : (
              todaySessions.map((session: Session) => (
                <div 
                  key={session.id}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="timeline-item grid grid-cols-5 gap-4 py-4 border-b border-white/5 hover:bg-emerald-500/[0.03] transition-all cursor-pointer group relative"
                >
                  {/* Active row glow */}
                  {session.status === "Active" && (
                    <div className="absolute inset-y-0 start-0 w-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[12px] font-black text-white uppercase tracking-tight truncate group-hover:text-emerald-400 transition-colors">{session.groupName}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("dashboard.modal.level")} {session.groupLevel}</span>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <Badge 
                      variant={session.status === "Active" ? "success" : session.status === "Ended" ? "default" : "primary"} 
                      className="text-[9px] px-3 shadow-lg"
                    >
                      {session.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">{format(new Date(session.scheduledAt), "MMM dd, HH:mm")}</span>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <button className="w-8 h-8 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-all">
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                    <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="space-y-6">
          {/* Next Focus Card */}
          {(() => {
            const nextFocus = todaySessions.find((s: any) => s.status === "Active") || 
                             todaySessions.find((s: any) => new Date(s.scheduledAt) > new Date());
            
            if (!nextFocus) return null;
            const isNow = nextFocus.status === "Active";
            
            return (
              <div className={cn(
                "card-aero p-6 border-none relative overflow-hidden transition-all duration-700 hover:scale-[1.01] group/focus",
                isNow 
                  ? "bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 shadow-lg shadow-emerald-500/20" 
                  : "bg-gradient-to-br from-emerald-500/20 to-teal-600/10"
              )}>
                <div className="absolute top-[-20%] end-[-10%] w-48 h-48 bg-emerald-400/20 blur-[80px] rounded-full group-hover/focus:scale-125 transition-transform duration-1000" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="space-y-4 flex-1">
                     <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase", isNow ? "bg-white text-emerald-600 animate-pulse" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30")}>
                            {isNow ? t("dashboard.focus.live_now") : t("dashboard.focus.upcoming")}
                        </div>
                        <span className="text-white/60 text-[10px] font-bold flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {format(new Date(nextFocus.scheduledAt), "HH:mm")}
                        </span>
                     </div>
                     <h3 className={cn("text-xl font-sora font-black uppercase tracking-tight truncate", isNow ? "text-white" : "text-white")}>
                       {nextFocus.groupName}
                     </h3>
                     <button 
                       onClick={() => navigate(`/sessions/${nextFocus.id}`)}
                       className={cn(
                         "w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95",
                         isNow ? "bg-white text-emerald-600" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                       )}
                     >
                       {isNow ? <Play className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                       {isNow ? t("dashboard.focus.resume") : t("dashboard.focus.prepare")} 
                     </button>
                  </div>

                  {isNow && (
                    <div className="shrink-0 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <CircularTimer startedAt={nextFocus.scheduledAt} />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Recent Activity */}
          <div className="card-aero p-6">
             <h2 className="text-[11px] font-sora font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-emerald-pulse" />
                {t("dashboard.activity.title")}
             </h2>
             <div className="space-y-5">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex gap-4 group cursor-pointer" onClick={() => navigate(`/sessions/${activity.id}`)}>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 group-hover:scale-[1.5] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-all duration-500" />
                      <div className="space-y-1">
                        <p className="text-[12px] text-slate-200 font-bold uppercase tracking-tight leading-tight group-hover:text-emerald-400 transition-colors truncate">
                          {t("dashboard.activity.session_completed", { group: activity.groupName })}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-600" />
                          {format(new Date(activity.endedAt || activity.updatedAt), "h:mm a • MMM dd")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState 
                    icon={Bell}
                    title={t("dashboard.activity.empty", "No Recent Activity")}
                    description="Activity logs are currently empty. Operation logs will populate as sessions are conducted."
                    className="py-10"
                  />
                )}
             </div>
          </div>
        </div>
      </div>
      </SectionErrorBoundary>

      {/* Phase 8: Create Session Modal — only for Admin/Engineer */}
      {canCreateSession && (
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title={t("dashboard.modal.title")}
      >
        <div className="space-y-8 p-2">
          <div className="space-y-4">
            <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t("dashboard.modal.select_group")}</label>
            <div className="relative group/select">
              <select 
                className="w-full h-14 rounded-2xl border border-emerald-500/20 bg-slate-950 px-5 text-sm font-black uppercase text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                value={newSessionGroupId}
                onChange={(e) => setNewSessionGroupId(e.target.value)}
              >
                <option value="" className="bg-slate-950">{t("dashboard.modal.placeholder")}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-slate-950">{g.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                 <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {(() => {
            const selectedGroup = groups.find(g => g.id === newSessionGroupId);
            if (!selectedGroup) return null;
            const startingOffset = (selectedGroup.startingSessionNumber || 1) - 1;
            const currentLogical = selectedGroup.currentSessionNumber;
            return (
              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-500 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-base text-white uppercase tracking-tighter leading-none">{selectedGroup.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{t("dashboard.modal.level")} {selectedGroup.level}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{selectedGroup.studentCount ?? 0} {t("dashboard.modal.students")}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("dashboard.modal.progression")}</p>
                   <p className="text-2xl font-sora font-black text-white leading-none">
                      {currentLogical}
                      <span className="text-sm text-slate-600 font-bold"> / {selectedGroup.totalSessions}</span>
                   </p>
                   {startingOffset > 0 && (
                     <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Starts at S{startingOffset + 1}</p>
                   )}
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t("dashboard.modal.timestamp")}</label>
            <Input 
              type="datetime-local" 
              value={newSessionDate}
              onChange={(e) => setNewSessionDate(e.target.value)}
              className="h-14 rounded-2xl bg-slate-950 border-emerald-500/20 text-white font-black uppercase text-xs tracking-widest focus:ring-4 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex gap-4 pt-8 border-t border-emerald-500/10">
             <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px]" onClick={() => setIsCreateOpen(false)}>{t("dashboard.modal.abort")}</Button>
             <Button disabled={submitting || !newSessionGroupId} className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-emerald-500/20" onClick={handleCreateSession}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("dashboard.modal.submit")}
             </Button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
};

export default DashboardPage;
