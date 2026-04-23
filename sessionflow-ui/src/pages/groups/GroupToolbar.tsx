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
    <div className="card-base !p-2 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border-white/5 animate-in fade-in slide-in-from-bottom-6 duration-1000 animate-stagger-2">
      {/* Search Bar + Mobile View Toggle */}
      <div className="flex items-center gap-3 w-full md:w-auto md:flex-1">
        <div className="relative flex-1 group bg-white/[0.02] md:bg-transparent rounded-xl border border-white/5 md:border-none">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-[var(--ui-accent)]" />
          <input 
            placeholder={t("common.search")} 
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-10 h-10 w-full bg-transparent border-none focus:outline-none text-[11px] md:text-xs text-slate-200 uppercase tracking-widest font-medium"
          />
        </div>
        
        <div className="flex md:hidden gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 shrink-0">
          <button 
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative", 
              viewMode === "grid" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            {viewMode === "grid" && (
              <motion.div layoutId="view-bg-mobile" className="absolute inset-0 bg-[var(--ui-accent)]/10 rounded-lg border border-[var(--ui-accent)]/20 shadow-[inset_0_0_10px_rgba(var(--ui-accent-rgb),0.1)]" />
            )}
            <LayoutGrid className="w-3.5 h-3.5 relative z-10" />
          </button>
          <button 
            onClick={() => onViewModeChange("list")}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative", 
              viewMode === "list" ? "text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            {viewMode === "list" && (
              <motion.div layoutId="view-bg-mobile" className="absolute inset-0 bg-[var(--ui-accent)]/10 rounded-lg border border-[var(--ui-accent)]/20 shadow-[inset_0_0_10px_rgba(var(--ui-accent-rgb),0.1)]" />
            )}
            <List className="w-3.5 h-3.5 relative z-10" />
          </button>
        </div>
      </div>

      <div className="h-6 w-px bg-white/5 hidden lg:block" />

      {/* Filters Container */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
        {/* Status Filter */}
        <div className="flex bg-white/[0.03] p-1 rounded-xl md:rounded-2xl border border-white/5 relative overflow-hidden shrink-0">
          {["All", "Active", "Completed", "Archived"].map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              className={cn(
                "px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10 touch-target md:touch-auto",
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
        <div className="flex bg-white/[0.03] p-1 rounded-xl md:rounded-2xl border border-white/5 relative overflow-hidden shrink-0">
          <button
            onClick={() => onDayFilterChange(null)}
            className={cn(
              "px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10 touch-target md:touch-auto",
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
                "px-2.5 md:px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10 touch-target md:touch-auto",
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
      </div>
      
      <div className="h-6 w-px bg-white/5 hidden md:block" />
      
      {/* Desktop View Toggle */}
      <div className="hidden md:flex gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/5 shrink-0">
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
