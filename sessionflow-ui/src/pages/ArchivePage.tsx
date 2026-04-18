import React, { useState, useEffect, useRef } from "react";
import { History, Search, LayoutGrid, List, Loader2, Info, Eye, Clock, MessageSquare, Database, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Badge } from "../components/ui";
import { useInfiniteGroups } from "../queries/useGroupQueries";
import { Group, PaginatedResponse } from "../types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";

const ArchivePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteGroups({ 
    search: debouncedSearch, 
    status: "Completed",
    pageSize: 12 
  });

  const groups = data?.pages.flatMap(page => (page as PaginatedResponse<Group>).items) || [];

  // Infinite Scroll Sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage, isLoading]);

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      {/* Decorative Zenith Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--ui-accent)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0 relative z-10">
        <div className="space-y-1 text-start">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-[var(--ui-accent)]" />
            {t("common.archive")}
          </h1>
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-[0.2em]">
             {t("archive.description") || "Historical Unit Records & Intelligence"}
          </p>
        </div>
        
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
           <button 
             onClick={() => setViewMode("grid")}
             className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-[var(--ui-accent)] text-white shadow-glow" : "text-slate-600 hover:text-slate-400")}
           >
             <LayoutGrid className="w-4 h-4" />
           </button>
           <button 
             onClick={() => setViewMode("list")}
             className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-[var(--ui-accent)] text-white shadow-glow" : "text-slate-600 hover:text-slate-400")}
           >
             <List className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 relative z-10">
        {[
          { label: "Archived Units", value: groups.length, icon: History },
          { label: "Total Data Blocks", value: groups.reduce((acc, g) => acc + (g.totalSessions || 0), 0), icon: Database },
          { label: "Stability Rating", value: "99.9%", icon: ArrowUpRight }
        ].map((stat, i) => (
          <div key={i} className="card-base p-6 flex items-center justify-between group">
            <div className="space-y-1 text-start">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-white tracking-tighter">{stat.value}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 bg-[var(--ui-accent)]/5 text-[var(--ui-accent)] group-hover:scale-110 transition-transform shadow-glow">
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 flex items-center shrink-0 relative z-10">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[var(--ui-accent)] transition-colors" />
          <input 
            placeholder={t("groups.search_placeholder")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-black/40 border border-white/5 rounded-xl ps-12 pe-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]/30 transition-all font-bold"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full p-4 lg:p-8 space-y-8 animate-fade-in custom-scrollbar overflow-y-auto relative z-10">
        {isLoading ? (
          <div className={cn(
            "grid gap-8",
            viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="card-base h-64 animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-6">
            <History className="w-24 h-24 text-slate-600" />
            <p className="text-sm font-bold uppercase tracking-[0.3em]">{search ? t("common.no_results") : t("archive.empty_title") || "VAULT EMPTY"}</p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-8 pb-20",
            viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {groups.map((group: Group) => (
              <div 
                key={group.id}
                className={cn(
                  "card-base relative group transition-all duration-500 overflow-hidden text-start",
                  viewMode === "grid" ? "p-6 flex flex-col h-full" : "p-4 flex items-center gap-6"
                )}
              >
                {/* Visual Accent */}
                <div className={cn("absolute top-0 left-0 w-1 h-full opacity-50", 
                  group.colorTag === "blue" ? "bg-blue-500" :
                  group.colorTag === "emerald" ? "bg-emerald-500" :
                  group.colorTag === "purple" ? "bg-purple-500" :
                  "bg-[var(--ui-accent)]"
                )} />

                <div className={cn("space-y-4 w-full flex-1", viewMode === "list" && "flex items-center gap-6 space-y-0")}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-5 px-3 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-widest flex items-center text-slate-500">
                        LVL {group.level}
                      </div>
                      <div className="h-5 px-3 rounded-md bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[9px] font-bold uppercase tracking-widest flex items-center border border-[var(--ui-accent)]/20 shadow-glow">
                        ARCHIVED
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase group-hover:text-[var(--ui-accent)] transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-slate-500 text-[11px] line-clamp-2 mt-2 leading-relaxed">
                      {group.description || t("archive.data_preserved") || "Mission records successfully committed to long-term storage."}
                    </p>
                  </div>

                  <div className={cn(
                    "grid gap-6 border-t border-white/5 pt-4 mt-6",
                    viewMode === "grid" ? "grid-cols-2" : "flex items-center gap-12 pt-0 mt-0 border-none"
                  )}>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{t("groups.students")}</p>
                      <p className="text-sm font-bold text-white tabular-nums">{group.numberOfStudents}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{t("groups.sessions")}</p>
                      <p className="text-sm font-bold text-white tabular-nums">{group.totalSessions}/{group.totalSessions}</p>
                    </div>
                  </div>

                  <div className={cn("flex gap-3", viewMode === "grid" ? "mt-8" : "ml-auto")}>
                    <button 
                      onClick={() => navigate(`/groups/${group.id}/sessions`)}
                      className="flex-1 h-11 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {t("common.details")}
                    </button>
                    <button 
                      onClick={() => navigate(`/chat?groupId=${group.id}`)}
                      className="w-11 h-11 rounded-xl bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 hover:bg-[var(--ui-accent)]/20 transition-all flex items-center justify-center shadow-glow"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger Indicator */}
        <div ref={sentinelRef} className="h-20 flex items-center justify-center pb-20">
           {isFetchingNextPage && (
             <div className="flex items-center gap-3">
               <Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" />
               <span className="text-[9px] uppercase font-black tracking-[0.3em] text-slate-600">Retrieving Archived Intel...</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;
