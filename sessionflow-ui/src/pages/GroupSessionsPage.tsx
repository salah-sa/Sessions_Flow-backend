import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle, Clock, Circle, ChevronRight, Users, User, Layers, Target, Activity, ShieldCheck, Zap, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { Session, Group } from "../types";
import { useGroup } from "../queries/useGroupQueries";
import { useInfiniteSessions } from "../queries/useSessionQueries";
import gsap from "gsap";
import { useHoverSound } from "../hooks/useHoverSound";
import { useQueryClient } from "@tanstack/react-query";

const GroupSessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const playHover = useHoverSound();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading: groupLoading } = useGroup(groupId || "");
  const { data: sessionsData, isLoading: sessionsLoading } = useInfiniteSessions({ 
    groupId: groupId || "",
    pageSize: 100 
  });

  const sessions = (sessionsData?.pages.flatMap(page => (page as any).items) || [])
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const loading = groupLoading || sessionsLoading;
  
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && group && sessions.length > 0) {
      const tl = gsap.timeline();
      tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
        .fromTo(".info-card", { opacity: 0, scale: 0.95, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.2)" }, "-=0.3")
        .fromTo(".stat-card", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" }, "-=0.2")
        .fromTo(".timeline-item", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }, "-=0.2");

      setTimeout(() => {
        activeSessionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [loading, group, sessions.length]);

  // Robust offset detection: check group metadata or the first session's number
  // For Level 4, we default to starting from 9 as requested
  const baseOffset = group?.level === 4 ? 8 : 0;
  const startingOffset = Math.max(baseOffset, (group?.startingSessionNumber || 1) - 1);
  const completedCount = sessions.filter(s => s.status === "Ended" || s.status === "Cancelled").length;
  const activeCount = sessions.filter(s => s.status === "Active").length;
  const scheduledCount = sessions.filter(s => s.status === "Scheduled").length;
  // Progress is calculated based on what's actually finished PLUS what was skipped by starting mid-way
  // Level 2 has exactly 12 sessions.
  const totalSessions = group?.level === 2 ? 12 : (group?.totalSessions || sessions.length);
  const logicalCompleted = (group?.currentSessionNumber || 1) - 1;
  const progressPercent = totalSessions > 0 ? Math.round((logicalCompleted / totalSessions) * 100) : 0;

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 h-full bg-[#030712]/50">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-[var(--ui-surface)]/50 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-[var(--ui-surface)]/50 rounded-lg" />
            <div className="h-4 w-32 bg-[var(--ui-surface)]/30 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[var(--ui-surface)]/20 rounded-2xl animate-pulse" style={{ animationDelay: `${i*100}ms` }} />)}
        </div>
        <div className="h-32 bg-[var(--ui-surface)]/10 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--ui-surface)]/10 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Nebula Ambient Light - Moved to fixed to stay behind everything */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header & Metrics Section (Static/Sticky) */}
      <div className="flex-none w-full max-w-5xl mx-auto px-8 pt-8 space-y-6">
        {/* Header */}
      <div ref={headerRef} className="flex items-center gap-6 opacity-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="w-12 h-12 rounded-2xl hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all group">
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 rtl:rotate-180" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-sora font-extrabold text-white tracking-tighter">
              {t("group_sessions.page_title")}
            </h1>
            <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-400 uppercase">{t("sessions.status_live")}</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-200 font-bold">{group?.name || "Target Node"}</span>
            <span className="text-slate-600 opacity-50">|</span>
            <span className="text-xs text-slate-500 font-semibold">ID: {groupId?.slice(0, 8)}</span>
          </p>
        </div>
        {group?.status && (
          <div className={cn(
            "px-6 py-2 rounded-2xl border-2 flex items-center gap-2 shadow-lg",
            group.status === "Active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10" : 
            group.status === "Completed" ? "border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-blue-500/10" : 
            "border-slate-700 bg-[var(--ui-surface)] text-slate-400"
          )}>
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold">{group.status}</span>
          </div>
        )}
      </div>

      {/* Info Cards Grid */}
      <div ref={cardsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="info-card card-aero p-5 flex flex-col gap-4 opacity-0 border-emerald-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-12 h-12 text-blue-500" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{t("group_sessions.level")}</p>
            <p className="text-xl font-sora font-semibold text-white">{group?.level || "—"}</p>
          </div>
        </div>

        <div className="info-card card-aero p-5 flex flex-col gap-4 opacity-0 border-emerald-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{t("group_sessions.students")}</p>
            <p className="text-xl font-sora font-semibold text-white">{group?.studentCount || "0"}</p>
          </div>
        </div>

        <div className="info-card card-aero p-5 flex flex-col gap-4 opacity-0 border-emerald-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target className="w-12 h-12 text-purple-500" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{t("group_sessions.current_session")}</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-sora font-semibold text-white leading-none">
                {String(group?.currentSessionNumber || 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col -space-y-1">
                <span className="text-xs text-slate-600 font-semibold">OF</span>
                <span className="text-sm text-slate-400 font-semibold tabular-nums">{totalSessions}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="info-card card-aero p-5 flex flex-col gap-4 opacity-0 border-emerald-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <User className="w-12 h-12 text-amber-500" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{t("group_sessions.engineer")}</p>
            <p className="text-sm font-sora font-semibold text-white leading-tight truncate">{group?.engineerName || "—"}</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div ref={statsRef} className="card-aero p-8 space-y-6 border-[var(--ui-surface)]/50 backdrop-blur-xl bg-[var(--ui-sidebar-bg)]/10 relative overflow-hidden">
        {/* Neural Scan Beam */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-[-100%] w-[200%] h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-scan z-20" />
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-500/60 uppercase">{t("group_sessions.progress_label")}</p>
            <h3 className="text-4xl font-sora font-semibold text-white flex items-baseline gap-2">
              {progressPercent}%
              <span className="text-xs text-slate-600 font-bold tracking-normal italic uppercase">{t("group_sessions.sync_complete")}</span>
            </h3>
          </div>
          <div className="flex gap-4">
            <div className="text-start stat-card opacity-0 bg-[var(--ui-bg)]/40 p-4 rounded-2xl border border-white/5 min-w-[120px] relative overflow-hidden group/metric">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                 <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-sora font-semibold text-white tabular-nums">{logicalCompleted}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">{t("group_sessions.completed")}</p>
            </div>
            <div className="text-start stat-card opacity-0 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 min-w-[120px] relative overflow-hidden group/metric">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                 <Clock className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-2xl font-sora font-semibold text-emerald-400 tabular-nums">{activeCount + scheduledCount}</p>
              <p className="text-xs font-semibold text-emerald-500/40 uppercase mt-1">{t("group_sessions.upcoming")}</p>
            </div>
            <div className="text-start stat-card opacity-0 bg-[var(--ui-bg)]/40 p-4 rounded-2xl border border-white/5 min-w-[120px] relative overflow-hidden group/metric">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                 <Target className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-sora font-semibold text-white tabular-nums">{totalSessions}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">{t("group_sessions.total")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 relative group/prog">
          <div className="flex justify-between items-end mb-1">
             <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-500 uppercase">{t("groups.card.progression")}</p>
                <p className="text-3xl font-sora font-semibold text-white leading-none">
                  {progressPercent}<span className="text-sm text-emerald-500/50 ms-0.5">%</span>
                </p>
             </div>
             <div className="text-end">
                <p className="text-xs font-semibold text-slate-500 uppercase leading-none mb-1">{t("dashboard.modal.level")}</p>
                <div className="px-3 py-1 bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 rounded-lg text-xs font-semibold text-[var(--ui-accent)] uppercase tracking-tighter">
                   Level {group?.level || "-"}
                </div>
             </div>
          </div>

          <div className="h-4 w-full bg-[var(--ui-bg)]/80 rounded-full p-1 border border-[var(--ui-surface)] shadow-inner relative overflow-hidden group-hover/prog:border-emerald-500/30 transition-colors">
            {/* Neural Scan Line Effect */}
            <div className="absolute top-0 bottom-0 w-2 bg-emerald-400/20 blur-md animate-scan pointer-events-none z-10" />
            
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-500 rounded-full transition-all duration-[1.5s] ease-out relative shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Micro-sparkle shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan" />
            </div>
          </div>

          <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase pt-1">
            <span className="flex items-center gap-1.5 font-bold">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               {t("group_sessions.secure_log", { count: logicalCompleted })}
            </span>
            <span>{Math.max(0, totalSessions - logicalCompleted)} {t("group_sessions.remaining")}</span>
          </div>
        </div>
        </div>
      </div>

      {/* Timeline Section (Scrolling) */}
      <div className="flex-1 w-full h-full p-4 lg:p-8 space-y-8 animate-fade-in custom-scrollbar overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10 pb-32 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-sm font-semibold text-white uppercase flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-500" />
              {t("group_sessions.session_timeline")}
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-emerald-500/80 uppercase">{t("group_sessions.realtime_stream")}</span>
            </div>
          </div>

        {sessions.length === 0 ? (
          <div className="card-aero p-20 text-center space-y-6 border-dashed border-[var(--ui-surface)]">
            <div className="w-20 h-20 rounded-3xl bg-[var(--ui-sidebar-bg)] flex items-center justify-center mx-auto border border-[var(--ui-surface)] shadow-xl group hover:border-emerald-500/30 transition-all duration-500">
              <div className="p-4 rounded-2xl bg-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                <Calendar className="w-8 h-8 text-slate-600 group-hover:text-emerald-400" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-sora font-semibold text-slate-300 uppercase tracking-[0.1em]">{t("group_sessions.no_sessions")}</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">{t("group_sessions.no_sessions_hint")}</p>
            </div>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
            >
              {t("dashboard.quick_schedule.button")}
            </Button>
          </div>
        ) : (
          <div ref={timelineRef} className="relative pl-10 space-y-6">
            {/* Timeline Backbone */}
            <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-[var(--ui-surface)] shadow-[0_0_10px_rgba(0,0,0,0.5)]" />

            {sessions.map((session, index) => {
              const logicalNumber = session.sessionNumber ?? (startingOffset + index + 1);
              const isCompleted = session.status === "Ended";
              const isActive = session.status === "Active";
              const isCurrentLogical = logicalNumber === group?.currentSessionNumber;
              const isPast = !isCompleted && !isActive && !isCurrentLogical && new Date(session.scheduledAt) < new Date();

              return (
                <div 
                  key={session.id || index} 
                  ref={isCurrentLogical || isActive ? activeSessionRef : null}
                  className="timeline-item relative opacity-0"
                >
                  {/* Timeline Hub */}
                  <div className={cn(
                    "absolute -left-[30px] top-5 w-5 h-5 rounded-full border-[3px] z-10 transition-all duration-500",
                    isCompleted ? "bg-emerald-500 border-[var(--ui-sidebar-bg)] shadow-[0_0_15px_rgba(16,185,129,0.5)]" :
                    isActive ? "bg-blue-500 border-[var(--ui-sidebar-bg)] animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.8)] scale-125" :
                    isCurrentLogical ? "bg-emerald-400 border-[var(--ui-sidebar-bg)] shadow-[0_0_20px_rgba(16,185,129,0.8)] scale-110" :
                    isPast ? "bg-red-500 border-[var(--ui-sidebar-bg)]" :
                    "bg-[var(--ui-surface)] border-[var(--ui-sidebar-bg)]"
                  )} />

                  <div
                    className={cn(
                      "flex items-center gap-6 p-6 rounded-2xl border transition-all duration-500 group/session cursor-pointer backdrop-blur-md relative overflow-hidden",
                      isCompleted ? "bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/30" :
                      isActive ? "bg-blue-500/[0.05] border-blue-500/30 hover:border-blue-500/60 shadow-2xl shadow-blue-500/10 scale-[1.01]" :
                      isCurrentLogical ? "bg-emerald-500/[0.08] border-emerald-500/40 hover:border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.01]" :
                      isPast ? "bg-red-500/[0.02] border-red-500/10 opacity-70" :
                      "bg-[var(--ui-sidebar-bg)]/40 border-[var(--ui-surface)] hover:border-slate-700 hover:bg-[var(--ui-sidebar-bg)]/60"
                    )}
                    onClick={() => session.id && navigate(`/sessions/${session.id}`)}
                  >
                    {/* Dynamic Indicator */}
                    {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 animate-pulse" />}

                    {/* Status Icon Orb */}
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                      isCompleted ? "bg-emerald-500/10 border-emerald-500/20 shadow-inner" :
                      isActive ? "bg-blue-500/20 border-blue-500/40 animate-pulse" :
                      isCurrentLogical ? "bg-emerald-500/20 border-emerald-500/40 animate-emerald-pulse" :
                      "bg-[var(--ui-surface)]/50 border-slate-700"
                    )}>
                      {isCompleted ? <CheckCircle className="w-7 h-7 text-emerald-400" /> :
                       isActive ? <Circle className="w-6 h-6 text-blue-400 fill-blue-400" /> :
                       isCurrentLogical ? <Play className="w-6 h-6 text-emerald-400 fill-emerald-400/20" /> :
                       <Clock className="w-6 h-6 text-slate-500" />}
                    </div>

                    {/* Session Detail */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-sora font-semibold text-white leading-none">
                          {t("group_sessions.session_number", { number: logicalNumber })}
                        </p>
                        {isActive && <span className="text-xs font-semibold text-blue-400 animate-pulse uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{t("group_sessions.live_node")}</span>}
                        {isCurrentLogical && !isActive && <span className="text-xs font-semibold text-emerald-400 animate-pulse uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CURRENT NODE</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 
                          {new Date(session.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 
                          {new Date(session.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge Tag */}
                    <div className={cn(
                      "px-4 py-1.5 rounded-xl border text-xs font-semibold",
                      isCompleted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      isActive ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]" :
                      isCurrentLogical ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
                      isPast ? "bg-red-500/10 border-red-500/30 text-red-400" :
                      "bg-[var(--ui-surface)]/50 border-slate-700 text-slate-500"
                    )}>
                      {isCompleted ? t("group_sessions.status.archived") : isActive ? t("group_sessions.status.live") : isCurrentLogical ? "PREPPED" : isPast ? t("group_sessions.status.expired") : t("group_sessions.status.standby")}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[var(--ui-surface)]/10 flex items-center justify-center opacity-0 group-hover/session:opacity-100 group-hover/session:bg-white/5 transition-all duration-300">
                      <ChevronRight className="w-5 h-5 text-emerald-500 rtl:rotate-180" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default GroupSessionsPage;

