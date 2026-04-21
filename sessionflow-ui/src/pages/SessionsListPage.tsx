import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Calendar, LayoutGrid, List as ListIcon, Box, Zap, Clock, ChevronRight, Hash, User } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Skeleton } from "../components/ui";
import { useInfiniteSessions } from "../queries/useSessionQueries";
import { Session, PaginatedResponse } from "../types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useHoverSound } from "../hooks/useHoverSound";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════
// Modern Status Badge
// ═══════════════════════════════════════════════
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    Active: {
      bg: "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20",
      text: "text-[var(--ui-accent)]",
      dot: "bg-[var(--ui-accent)]",
      label: "Active Now"
    },
    Scheduled: {
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-400",
      dot: "bg-blue-400",
      label: "Scheduled"
    },
    Ended: {
      bg: "bg-white/5 border-white/5",
      text: "text-slate-500",
      dot: "bg-slate-600",
      label: "Completed"
    },
    Cancelled: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      dot: "bg-red-500",
      label: "Cancelled"
    },
  };
  const c = config[status] || config.Ended;
  return (
    <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-bold tracking-tight", c.bg, c.text)}>
      <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", c.dot, status === "Active" && "animate-pulse")} />
      {c.label}
    </div>
  );
};

const SessionsListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const playHover = useHoverSound();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "active" | "completed">("upcoming");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const statusMap: Record<string, string> = {
    upcoming: "Scheduled",
    active: "Active",
    completed: "Ended",
  };

  const { 
    data, 
    isLoading: loading, 
    isFetchingNextPage: loadingMore, 
    hasNextPage: hasMore, 
    fetchNextPage: loadMore 
  } = useInfiniteSessions({ 
    status: statusMap[activeTab],
    pageSize: 20
  });

  const sessions = data?.pages.flatMap(page => (page as PaginatedResponse<Session>).items) || [];

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore, loading]);

  const filteredSessions = sessions.filter(s => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower) return true;
    return (s.groupName?.toLowerCase().includes(searchLower) ?? false) || 
           (s.group?.name?.toLowerCase().includes(searchLower) ?? false) ||
           (s.engineerName?.toLowerCase().includes(searchLower) ?? false);
  });

  const tabs = [
    { id: "upcoming", label: "Scheduled", icon: Calendar, color: "text-blue-400" },
    { id: "active", label: "Live Now", icon: Zap, color: "text-emerald-400" },
    { id: "completed", label: "History", icon: Clock, color: "text-slate-400" },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] text-slate-200 font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full" />
      </div>

      {/* Header Section */}
      <header className="relative z-20 px-10 pt-10 pb-6 shrink-0 border-b border-white/[0.03] bg-black/20 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--ui-accent)] to-[#7e22ce]">Sessions</span>
              <span className="text-[var(--ui-surface)] text-2xl sm:text-3xl hidden sm:inline">/</span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase pt-1 sm:pt-1.5">Management</span>
            </h1>
            <p className="text-slate-500 mt-1 max-w-md text-sm">Efficiently manage and track all learning sessions, live broadcasts, and historical records.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative group w-full sm:min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[var(--ui-accent)] transition-colors" />
              <input 
                placeholder="Find a session or engineer..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:border-[var(--ui-accent)]/30 transition-all placeholder:text-slate-700"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.05]">
              <button 
                onClick={() => setViewMode("list")}
                onMouseEnter={playHover}
                className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-slate-600 hover:text-slate-400")}
              >
                <ListIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode("grid")}
                onMouseEnter={playHover}
                className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-slate-600 hover:text-slate-400")}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-6 sm:gap-8 mt-6 sm:mt-10 relative overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              onMouseEnter={playHover}
              className={cn(
                "pb-4 px-1 text-sm font-bold transition-all relative group flex items-center gap-2",
                activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "text-slate-600")} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabNav"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ui-accent)] shadow-[0_0_12px_rgba(var(--ui-accent-rgb),0.5)]" 
                />
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          {loading ? (
            <div key="loading" className="space-y-4 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-white/[0.02] border border-white/[0.05] rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-8 relative">
                 <Box className="w-10 h-10 text-[var(--ui-surface)]" />
                 <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">We couldn't find any sessions matching your current status or search criteria.</p>
            </motion.div>
          ) : viewMode === "list" ? (
            <div key="list" className="space-y-3 max-w-6xl mx-auto pb-20">
              {filteredSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className={cn(
                    "group relative flex items-center gap-6 p-5 rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden",
                    "bg-[var(--ui-sidebar-bg)] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.1] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:translate-x-1",
                    session.status === "Active" && "bg-[var(--ui-accent)]/[0.02] border-[var(--ui-accent)]/10 hover:border-[var(--ui-accent)]/20"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full transition-all group-hover:top-0 group-hover:bottom-0",
                    session.status === "Active" ? "bg-[var(--ui-accent)] shadow-[0_0_10px_rgba(var(--ui-accent-rgb),0.5)]" : 
                    session.status === "Scheduled" ? "bg-blue-500 shadow-[0_0_10px_#3b82f6]" : 
                    "bg-slate-700"
                  )} />

                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                    session.status === "Active" ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : 
                    session.status === "Scheduled" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : 
                    "bg-white/[0.02] border-white/[0.04] text-slate-600"
                  )}>
                    {session.status === "Active" ? <Zap className="w-5 h-5 animate-pulse" /> : <Calendar className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-white truncate transition-colors group-hover:text-[var(--ui-accent)]">
                        {session.groupName || session.group?.name || "Private Session"}
                      </h3>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-slate-500 text-sm">
                      <div className="flex items-center gap-2 font-medium group-hover:text-slate-400 transition-colors">
                        <User className="w-3.5 h-3.5" />
                        {session.engineerName || "Unassigned"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{format(new Date(session.scheduledAt), "EEEE, d MMM • h:mm a")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 shrink-0 px-4">
                     <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-[var(--ui-accent)] transition-colors group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div key="grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto pb-20">
              {filteredSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className={cn(
                    "group relative aspect-[4/3] p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer flex flex-col justify-between overflow-hidden",
                    "bg-[#0a0a0a]/60 border-white/[0.05] hover:bg-[#111] hover:border-white/[0.12] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]",
                    session.status === "Active" && "border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)]"
                  )}
                >
                  <div className={cn(
                    "absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-20 transition-all duration-700 group-hover:scale-150 group-hover:opacity-40",
                    session.status === "Active" ? "bg-[var(--ui-accent)]" : "bg-blue-500"
                  )} />

                  <div className="relative z-10 flex justify-between items-start">
                    <StatusBadge status={session.status} />
                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-slate-500">
                      <Hash className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto">
                    <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-[var(--ui-accent)] transition-colors truncate">
                      {session.groupName || session.group?.name || "Private Session"}
                    </h3>
                    <div className="space-y-1.5 text-slate-500 text-sm">
                       <div className="flex items-center gap-2 font-medium">
                          <User className="w-3.5 h-3.5" />
                          {session.engineerName || "Unassigned"}
                       </div>
                       <div className="flex items-center gap-2 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(session.scheduledAt), "MMM d, h:mm a")}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          {loadingMore && <Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" />}
        </div>
      </main>
    </div>
  );
};

export default SessionsListPage;

