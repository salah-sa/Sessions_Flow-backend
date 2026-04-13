import React, { useState, useEffect } from "react";
import { History, Search, LayoutGrid, List, Loader2, Info, Eye, Clock, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Input, Badge, Skeleton, EmptyState } from "../components/ui";
import { useInfiniteGroups } from "../queries/useGroupQueries";
import { Group } from "../types";
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

  const groups = data?.pages.flatMap(page => (page as any).items) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <History className="w-10 h-10 text-emerald-500" />
            {t("common.archive").toUpperCase()}
          </h1>
          <p className="text-slate-500 mt-1 font-medium tracking-wide">
            {t("archive.description") || "Completed group records and historical sessions."}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn("rounded-xl h-9 px-3", viewMode === "grid" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500")}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn("rounded-xl h-9 px-3", viewMode === "list" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500")}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-900/40 border-white/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <History className="w-16 h-16" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Archived Records</p>
          <h3 className="text-3xl font-black text-white">{groups.length}</h3>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <Input
            placeholder={t("groups.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 bg-slate-900/50 border-white/5 focus:border-emerald-500/30 h-12 rounded-2xl backdrop-blur-md transition-all sm:text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 bg-slate-900/50 rounded-3xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState 
          icon={History} 
          title={t("archive.empty_title") || "NO ARCHIVED GROUPS"} 
          description={search ? t("common.no_results") : t("archive.empty_desc") || "Groups will appear here once they complete all sessions."} 
        />
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {groups.map((group: Group) => (
            <Card 
              key={group.id}
              className={cn(
                "group relative overflow-hidden transition-all duration-500 hover:scale-[1.02]",
                viewMode === "grid" ? "rounded-3xl p-6" : "rounded-2xl p-4 flex items-center gap-6"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-950/90 -z-10" />
              <div className={cn("absolute top-0 left-0 w-1 h-full", 
                group.colorTag === "blue" ? "bg-blue-500" :
                group.colorTag === "emerald" ? "bg-emerald-500" :
                group.colorTag === "purple" ? "bg-purple-500" :
                "bg-amber-500"
              )} />

              <div className={cn("space-y-4 w-full", viewMode === "list" && "flex items-center gap-6 space-y-0")}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-tighter font-black bg-white/5 border-white/10">
                      Level {group.level}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold border-none">
                      Completed
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors uppercase italic">
                    {group.name}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-1 italic">
                    {group.description || "Historical data preserved"}
                  </p>
                </div>

                <div className={cn(
                  "grid gap-4",
                  viewMode === "grid" ? "grid-cols-2 border-t border-white/5 pt-4 mt-4" : "flex items-center gap-8"
                )}>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t("groups.students")}</p>
                    <p className="text-sm font-black text-white">{group.numberOfStudents}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t("groups.sessions")}</p>
                    <p className="text-sm font-black text-white">{group.totalSessions}/{group.totalSessions}</p>
                  </div>
                </div>

                <div className={cn("flex gap-2", viewMode === "grid" ? "mt-6" : "ml-auto")}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/groups/${group.id}/sessions`)}
                    className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 gap-2 border border-white/5"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/chat?groupId=${group.id}`)}
                    className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div className="flex justify-center pt-8">
          <Button
            variant="ghost"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-2xl bg-white/5 hover:bg-white/10 px-8 h-12 gap-3"
          >
            {isFetchingNextPage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t("common.load_more")
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
