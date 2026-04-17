import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Download, Search, Wallet, FileText, Loader2, Filter, 
  Archive, Clock, Layers, BarChart3, TrendingUp, Zap
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfYear, endOfYear, addWeeks, subWeeks, addYears, subYears,
  isSameWeek, isSameYear, isAfter, isBefore
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { gsap } from "gsap";
import { Card, Button, Input, Badge } from "../components/ui";
import { useInfiniteSessions } from "../queries/useSessionQueries";
import { useSettings } from "../queries/useSystemQueries";
import { Session, Group } from "../types";
import { cn } from "../lib/utils";
import { exportSessionsToICS } from "../lib/calendar";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/stores";
import { useQueryClient } from "@tanstack/react-query";

type ViewMode = "week" | "month" | "year";

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const user = useAuthStore(s => s.user);
  const isStudent = user?.role === "Student";
  const [groupIdFilter, setGroupIdFilter] = useState<string | "all">("all");
  const range = useMemo(() => {
    switch (viewMode) {
      case "week":
        return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
      case "year":
        return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
      case "month":
      default:
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, viewMode]);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = useInfiniteSessions({ 
    status: "Ended",
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString(),
    groupId: groupIdFilter === "all" ? undefined : groupIdFilter
  });

  const sessions = useMemo(() => {
    const raw = data?.pages.flatMap(page => (page as any).items) || [];
    // Ensure latest first sorting
    return [...raw].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [data]);
  const loading = isLoading;
  const loadingMore = isFetchingNextPage;
  const hasMore = hasNextPage;
  const loadMore = fetchNextPage;

  // Filter States
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [engineerFilter, setEngineerFilter] = useState<string | "all">("all");
  const [pricing, setPricing] = useState<Record<number, number>>({ 1: 100, 2: 100, 3: 100, 4: 150 });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // GSAP Animation Context
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loading && sessions.length > 0) {
      gsap.fromTo(".history-item", 
        { opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" },
        { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", stagger: 0.05, duration: 0.8, ease: "expo.out" }
      );
    }
  }, [loading, sessions.length, viewMode]);

  const { data: settings } = useSettings();

  useEffect(() => {
    if (settings) {
      const p: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 150 };
      for (let i = 1; i <= 4; i++) {
        const val = settings.find((s: any) => s.key === `session_price_level_${i}`)?.value;
        if (val) p[i] = parseInt(val) || p[i];
      }
      setPricing(p);
    }
  }, [settings]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s: Session) => {
      const matchesSearch = s.groupName?.toLowerCase().includes(search.toLowerCase()) || 
                           s.group?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = levelFilter === "all" || s.group?.level === levelFilter;
      const matchesEngineer = engineerFilter === "all" || s.engineerId === engineerFilter;
      return matchesSearch && matchesLevel && matchesEngineer;
    });
  }, [sessions, search, levelFilter, engineerFilter]);

  const uniqueGroups = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      if (s.groupId && s.groupName) map.set(s.groupId, s.groupName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const handleExportCal = () => {
    if (filteredSessions.length === 0) return toast.error("No sessions in range to export.");
    exportSessionsToICS(filteredSessions, `SessionFlow_Archive_${format(currentDate, "MMM_yyyy")}.ics`);
    toast.success("Calendar archive exported.");
  };

  const monthlySalary = filteredSessions.reduce((sum: number, s: Session) => {
    const level = s.group?.level || 1;
    return sum + (pricing[level] || 150);
  }, 0);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    filteredSessions.forEach((session: Session) => {
      const key = format(new Date(session.scheduledAt), viewMode === "year" ? "yyyy-MM" : "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSessions, viewMode]);

  const navigateRange = (dir: "next" | "prev") => {
    const amount = dir === "next" ? 1 : -1;
    switch (viewMode) {
      case "week": setCurrentDate(prev => addWeeks(prev, amount)); break;
      case "month": setCurrentDate(prev => addMonths(prev, amount)); break;
      case "year": setCurrentDate(prev => addYears(prev, amount)); break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden relative" ref={containerRef}>
      {/* Background Spatial Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Matrix */}
      <div className="p-8 border-b border-white/5 bg-slate-950/40 backdrop-blur-3xl z-10 flex flex-col gap-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <div className="p-2.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 shadow-glow shadow-brand-500/5">
                <History className="w-8 h-8 text-brand-500" />
              </div>
              {t("history.title", "Session History")}
            </h1>
            <div className="flex items-center gap-4 text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] ps-1">
               <span className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-brand-500" /> {t("history.archival", "Archival Logs")}</span>
               <span className="w-1 h-1 rounded-full bg-slate-800" />
               <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> {t("history.telemetry", "Operational Telemetry")}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
               {(["week", "month", "year"] as ViewMode[]).map((mode) => (
                 <button
                   key={mode}
                   onClick={() => setViewMode(mode)}
                   className={cn(
                     "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                     viewMode === mode 
                       ? "bg-white text-black shadow-lg shadow-white/10 scale-105" 
                       : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                   )}
                 >
                   {mode}
                 </button>
               ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center bg-slate-900/40 rounded-2xl border border-white/10 p-1">
               <button onClick={() => navigateRange("prev")} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                 <ChevronLeft className="w-5 h-5" />
               </button>
               <div className="px-8 min-w-[200px] text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{t("history.filters.focus_range", "Focus Range")}</p>
                 <p className="text-sm font-sora font-black text-white uppercase tracking-tighter tabular-nums">
                    {viewMode === "year" ? format(currentDate, "yyyy") : 
                     viewMode === "month" ? format(currentDate, "MMMM yyyy") : 
                     `${format(range.start, "MMM dd")} - ${format(range.end, "MMM dd")}`}
                 </p>
               </div>
               <button onClick={() => navigateRange("next")} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>

            {/* Revenue Sync */}
            <div className="flex items-center gap-6 bg-emerald-500/5 border border-emerald-500/10 px-8 py-4 rounded-2xl shadow-glow shadow-emerald-500/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-emerald-500/20 transition-all" />
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Wallet className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-0.5 opacity-70">{t("history.net_revenue")}</p>
                  <p className="text-2xl font-black text-white font-sora tabular-nums tracking-tighter">
                     {filteredSessions.reduce((sum, s) => sum + (s.stampedRevenue || 0), 0).toLocaleString()} 
                     <span className="text-emerald-500/50 text-xs ms-1.5 tracking-widest font-normal">EGP</span>
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Temporal Heatmap Slider */}
        <div className="w-full h-16 relative flex items-end gap-1 overflow-x-auto custom-scrollbar pb-2 group/slider">
            {(() => {
               const days = eachDayOfInterval(range);
               // O(S) Pre-computation
               const countsMap = new Map<string, number>();
               sessions.forEach(s => {
                 const k = format(new Date(s.scheduledAt), "yyyy-MM-dd");
                 countsMap.set(k, (countsMap.get(k) || 0) + 1);
               });
               
               let maxCount = 1;
               countsMap.forEach(count => {
                 if (count > maxCount) maxCount = count;
               });
               
               return days.map(day => {
                 const key = format(day, "yyyy-MM-dd");
                 const count = countsMap.get(key) || 0;
                 const intensity = count / maxCount;
                 const isToday = isSameDay(day, new Date());
                 
                 return (
                   <div 
                     key={key}
                     className="flex-1 shrink-0 min-w-[12px] flex flex-col justify-end group/bar cursor-crosshair relative"
                   >
                     <div 
                       className={cn(
                         "w-full rounded-t-sm transition-all duration-500",
                         isToday ? "bg-white" : count > 0 ? "bg-brand-500" : "bg-slate-800"
                       )}
                       style={{ 
                         height: count > 0 ? `${Math.max(20, intensity * 100)}%` : '4px',
                         opacity: isToday ? 1 : count > 0 ? 0.4 + (intensity * 0.6) : 0.2,
                         boxShadow: count > 0 ? `0 0 ${intensity * 10}px rgba(8, 217, 214, ${intensity * 0.5})` : 'none'
                       }}
                     />
                     {/* Hover Status Node */}
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg opacity-0 -translate-y-2 group-hover/bar:opacity-100 group-hover/bar:translate-y-0 shadow-xl transition-all duration-300 pointer-events-none whitespace-nowrap z-20 flex items-center gap-2">
                       <span className={cn("w-1.5 h-1.5 rounded-full", count > 0 ? "bg-brand-500 shadow-glow" : "bg-slate-600")} />
                       <p className="text-[9px] font-black uppercase text-white tracking-widest">{format(day, "MMM dd")} <span className="text-slate-500 ms-1">[{count} DATA_POINTS]</span></p>
                     </div>
                   </div>
                 );
               });
            })()}
            {/* Overlay Gradient for Slider effect */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-950/80 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950/80 to-transparent pointer-events-none z-10" />
        </div>
      </div>

      {/* Main Matrix Surface */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Filter & Summary */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-e border-white/5 bg-slate-900/20 backdrop-blur-2xl p-4 lg:p-8 space-y-8 flex flex-col shrink-0 overflow-y-auto custom-scrollbar max-h-[40vh] lg:max-h-full">
           <div className="space-y-6">
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("history.search_placeholder")}</p>
                 <div className="relative group">
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-brand-500" />
                    <input 
                      placeholder="TAG-SEARCH..." 
                      className="w-full h-12 bg-slate-950/60 border border-white/5 rounded-2xl ps-12 pe-4 text-[10px] font-black uppercase tracking-widest text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all border-glow"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("history.filters.protocols", "Protocols")}</p>
                 {[
                   { id: "group", label: t("history.filters.all_groups", "Groups"), value: groupIdFilter, setter: setGroupIdFilter, options: ["all", ...uniqueGroups.map(g => g.id)] },
                   { id: "level", label: t("history.filters.all_levels"), value: levelFilter, setter: setLevelFilter, options: ["all", 1, 2, 3, 4] },
                   { id: "engineer", label: t("history.filters.all_engineers"), value: engineerFilter, setter: setEngineerFilter, options: ["all", ...Array.from(new Set(sessions.map(s => s.engineerId))).filter(Boolean)] }
                 ].map((filter) => (
                   <div key={filter.id} className="space-y-2">
                      <select 
                        className="w-full h-12 rounded-2xl bg-slate-950/60 border border-white/5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        value={filter.value}
                        onChange={(e) => filter.setter(e.target.value === "all" ? "all" : e.target.value as any)}
                      >
                        <option value="all">ALL-{filter.label.replace(" ", "-").toUpperCase()}</option>
                         {filter.options.slice(1).map(opt => {
                           let label = String(opt);
                           if (filter.id === "level") label = `SECTOR-${opt}`;
                           else if (filter.id === "group") label = uniqueGroups.find(g => g.id === opt)?.name?.toUpperCase() || label;
                           else if (filter.id === "engineer") label = (sessions.find(s => s.engineerId === opt)?.engineerName || label).toUpperCase();
                           
                           return (
                             <option key={String(opt)} value={String(opt)}>
                               {label}
                             </option>
                           );
                         })}
                      </select>
                   </div>
                 ))}
              </div>
           </div>

           <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("history.export.export_label", "Export Telemetry")}</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleExportCal} className="btn-ghost py-4 flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-slate-950/40 hover:bg-brand-500/5 hover:border-brand-500/20 transition-all group/btn">
                    <CalendarIcon className="w-5 h-5 text-slate-600 group-hover/btn:text-brand-500 transition-colors" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{t("history.export.cal")}</span>
                 </button>
                 <button className="btn-ghost py-4 flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-slate-950/40 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all group/btn">
                    <Download className="w-5 h-5 text-slate-600 group-hover/btn:text-emerald-500 transition-colors" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{t("history.export.csv")}</span>
                 </button>
              </div>
              <button className="w-full h-14 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl hover:scale-[1.02] shadow-2xl active:scale-95 transition-all">
                 {t("history.export.generate_report", "Generate Global Report")}
              </button>
           </div>
        </div>

        {/* Dynamic Matrix Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-950/20">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-20 animate-pulse">
                <Loader2 className="w-16 h-16 animate-spin text-brand-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-500">Initiating Temporal Sync</p>
             </div>
           ) : groupedSessions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full space-y-8 py-20">
                <div className="p-8 rounded-full bg-slate-900/40 border border-white/5 relative">
                   <div className="absolute inset-0 bg-brand-500/5 blur-3xl rounded-full" />
                   <Archive className="w-16 h-16 text-slate-800 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                   <p className="text-2xl font-sora font-black text-slate-700 uppercase tracking-tighter">{t("history.empty_title", "Sector is Empty")}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">{t("history.no_records")}</p>
                </div>
             </div>
           ) : (
             <div className="space-y-16">
                {groupedSessions.map(([dateKey, dailySessions]: [string, Session[]]) => (
                  <div key={dateKey} className="space-y-6">
                    <div className="flex items-center gap-6 sticky top-0 py-4 bg-slate-950/40 backdrop-blur-md z-[5]">
                       <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5" />
                       <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-brand-500 shadow-glow" />
                          <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] tabular-nums">
                             {viewMode === "year" ? format(new Date(dateKey + "-01"), "MMMM yyyy") : format(new Date(dateKey), "EEEE • dd MMMM")}
                          </span>
                       </div>
                       <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/5" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                       {dailySessions.map((session: Session) => {
                          const totalStudents = session.attendanceRecords?.length || 0;
                          const present = session.attendanceRecords?.filter((a: any) => a.status === 'Present' || a.status === 'Late').length || 0;
                          const successRate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;
                          
                          return (
                            <div 
                              key={session.id} 
                              className="history-item group/card bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-slate-900 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer relative overflow-hidden shadow-2xl shadow-black/40"
                              onClick={() => navigate(`/sessions/${session.id}`)}
                            >
                               {/* Archive Stamp for Completed Groups */}
                               {session.group?.status === "Completed" && (
                                 <div className="absolute -right-6 -top-6 w-24 h-24 border-2 border-brand-500/20 rounded-full flex items-center justify-center rotate-12 opacity-40 group-hover/card:opacity-100 transition-opacity">
                                    <Archive className="w-8 h-8 text-brand-500" />
                                 </div>
                               )}

                               <div className="flex items-start justify-between gap-4 mb-6">
                                  <div className="space-y-1.5 min-w-0">
                                     <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-3 h-3 rounded-full shadow-glow",
                                          session.groupColorTag === "emerald" ? "bg-emerald-500/80 shadow-emerald-500/20" :
                                          session.groupColorTag === "rose" ? "bg-rose-500/80 shadow-rose-500/20" :
                                          "bg-brand-500/80 shadow-brand-500/20"
                                        )} />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol-{session.sessionNumber}</p>
                                     </div>
                                     <h3 className="text-xl font-sora font-black text-white uppercase tracking-tighter truncate leading-none">
                                        {session.groupName || session.group?.name}
                                     </h3>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                     <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/5 bg-slate-950/50 h-7 px-3 rounded-lg text-slate-400">
                                        LVL-{session.group?.level || 1}
                                     </Badge>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 gap-3 mb-6">
                                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/[0.02] flex flex-col justify-between">
                                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5 shrink-0">
                                        <Clock className="w-3 h-3" /> {t("common.time")}
                                     </p>
                                     <p className="text-xs font-black text-white tabular-nums tracking-tighter">
                                        {format(new Date(session.scheduledAt), "hh:mm a")}
                                     </p>
                                  </div>
                                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/[0.02] flex flex-col justify-between">
                                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5 shrink-0">
                                        <TrendingUp className="w-3 h-3" /> {isStudent ? t("history.status", "Status") : t("sessions.label_performance")}
                                     </p>
                                     <div className="flex items-baseline gap-1.5">
                                      {isStudent ? (
                                        (() => {
                                          const myRecord = session.attendanceRecords?.find(a => a.studentId === user?.studentId || a.student?.userId === user?.id);
                                          const attended = myRecord?.status === "Present" || myRecord?.status === "Late";
                                          return (
                                            <>
                                              <span className={cn(
                                                "text-sm font-black tabular-nums tracking-tighter",
                                                attended ? "text-emerald-400" : "text-rose-400"
                                              )}>
                                                {attended ? "ATTENDED" : "MISSED"}
                                              </span>
                                              <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">{myRecord?.status || "PENDING"}</span>
                                            </>
                                          );
                                        })()
                                      ) : (
                                        <>
                                          <span className={cn(
                                            "text-sm font-black tabular-nums tracking-tighter",
                                            (session.attendanceRate || 0) >= 0.8 ? "text-emerald-400" : (session.attendanceRate || 0) >= 0.5 ? "text-amber-400" : "text-rose-400"
                                          )}>
                                            {Math.round((session.attendanceRate || 0) * 100)}%
                                          </span>
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Efficiency</span>
                                        </>
                                      )}
                                     </div>
                                  </div>
                                  
                                  {/* Multi-data Breakdown Row */}
                                  <div className="col-span-2 grid grid-cols-3 gap-2">
                                    <div className="bg-slate-950/20 rounded-xl p-3 border border-white/5 text-center">
                                      <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Total</p>
                                      <p className="text-xs font-black text-white">{session.totalStudents || 0}</p>
                                    </div>
                                    <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 text-center">
                                      <p className="text-[8px] font-black text-emerald-600/80 uppercase mb-1">Present</p>
                                      <p className="text-xs font-black text-emerald-400">{session.presentCount || 0}</p>
                                    </div>
                                    <div className="bg-rose-500/5 rounded-xl p-3 border border-rose-500/10 text-center">
                                      <p className="text-[8px] font-black text-rose-600/80 uppercase mb-1">Absent</p>
                                      <p className="text-xs font-black text-rose-400">{session.absentCount || 0}</p>
                                    </div>
                                  </div>

                                  <div className="col-span-2 bg-slate-950/60 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                        <Wallet className="w-4 h-4" />
                                      </div>
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session Revenue</p>
                                    </div>
                                    <p className="font-sora font-black text-white tabular-nums tracking-tighter">
                                      {session.stampedRevenue?.toLocaleString() || 0} <span className="text-[9px] text-slate-600 ms-1">EGP</span>
                                    </p>
                                  </div>
                               </div>

                               <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-slate-600">{session.engineerName?.substring(0, 1) || "S"}</span>
                                     </div>
                                     <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">{t("history.deployment_unit", "Deployment Unit")}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{session.engineerName || "SYSTEM-OP"}</p>
                                     </div>
                                  </div>
                                  <div className="flex gap-2">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); navigate(`/groups/${session.groupId}/sessions`); }}
                                       className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all font-sora"
                                     >
                                        {t("common.details", "Details")}
                                     </button>
                                     <button className="w-10 h-10 rounded-xl bg-brand-500 text-black flex items-center justify-center shadow-lg shadow-brand-500/10 hover:scale-110 active:scale-90 transition-all">
                                        <FileText className="w-5 h-5" />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
