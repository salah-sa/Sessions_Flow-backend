import React from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

interface GroupToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  dayFilter: number | null;
  onDayFilterChange: (val: number | null) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (val: "grid" | "list") => void;
}

export const GroupToolbar: React.FC<GroupToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dayFilter,
  onDayFilterChange,
  viewMode,
  onViewModeChange
}) => {
  const { t } = useTranslation();

  const daysShort = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  return (
    <div className="card-base !p-2 flex items-center gap-4 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border-white/5 animate-in fade-in slide-in-from-bottom-6 duration-1000 animate-stagger-2 overflow-x-auto no-scrollbar">
      <div className="relative flex-1 min-w-[200px] group">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-[var(--ui-accent)]" />
        <input 
          placeholder={t("common.search")} 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-10 h-10 w-full bg-transparent border-none focus:outline-none text-xs text-slate-200 uppercase tracking-widest font-medium"
        />
      </div>

      <div className="h-6 w-px bg-white/5 hidden lg:block" />

      {/* Status Filter */}
      <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 relative overflow-hidden shrink-0">
        {["All", "Active", "Completed", "Archived"].map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilterChange(status)}
            className={cn(
              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10",
              statusFilter === status 
                ? "text-white" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {statusFilter === status && (
              <motion.div 
                layoutId="status-bg"
                className="absolute inset-0 bg-[var(--ui-accent)] rounded-lg shadow-glow shadow-[var(--ui-accent)]/20 z-[-1]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {t(`groups.status.${status.toLowerCase()}`, status)}
          </button>
        ))}
      </div>
      
      <div className="h-6 w-px bg-white/5 hidden xl:block" />

      {/* Day Filter */}
      <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 relative overflow-hidden shrink-0">
        <button
          onClick={() => onDayFilterChange(null)}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10",
            dayFilter === null 
              ? "text-white" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          {dayFilter === null && (
            <motion.div 
              layoutId="day-bg"
              className="absolute inset-0 bg-[var(--ui-accent)] rounded-lg shadow-glow shadow-[var(--ui-accent)]/20 z-[-1]"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {t("common.all", "All")}
        </button>
        {daysShort.map((day, idx) => (
          <button
            key={day}
            onClick={() => onDayFilterChange(idx)}
            className={cn(
              "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10",
              dayFilter === idx 
                ? "text-white" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {dayFilter === idx && (
              <motion.div 
                layoutId="day-bg"
                className="absolute inset-0 bg-[var(--ui-accent)] rounded-lg shadow-glow shadow-[var(--ui-accent)]/20 z-[-1]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {t(`common.days_short.${day}`, day)}
          </button>
        ))}
      </div>
      
      <div className="h-6 w-px bg-white/5" />
      
      <div className="flex gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/5 shrink-0">
        <button 
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all relative", 
            viewMode === "grid" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
          )}
        >
          {viewMode === "grid" && (
             <motion.div layoutId="view-bg" className="absolute inset-0 bg-[var(--ui-accent)]/10 rounded-lg border border-[var(--ui-accent)]/20 shadow-[inset_0_0_10px_rgba(var(--ui-accent-rgb),0.1)]" />
          )}
          <LayoutGrid className="w-4 h-4 relative z-10" />
        </button>
        <button 
          onClick={() => onViewModeChange("list")}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all relative", 
            viewMode === "list" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
          )}
        >
          {viewMode === "list" && (
             <motion.div layoutId="view-bg" className="absolute inset-0 bg-[var(--ui-accent)]/10 rounded-lg border border-[var(--ui-accent)]/20 shadow-[inset_0_0_10px_rgba(var(--ui-accent-rgb),0.1)]" />
          )}
          <List className="w-4 h-4 relative z-10" />
        </button>
      </div>
    </div>
  );
};
