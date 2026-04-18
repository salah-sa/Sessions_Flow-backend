import React from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

interface GroupToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (val: "grid" | "list") => void;
}

export const GroupToolbar: React.FC<GroupToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange
}) => {
  const { t } = useTranslation();

  return (
    <div className="card-base !p-2 flex items-center gap-4 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border-white/5 animate-in fade-in slide-in-from-bottom-6 duration-1000 animate-stagger-2">
      <div className="relative flex-1 group">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-[var(--ui-accent)]" />
        <input 
          placeholder={t("common.search")} 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-10 h-10 w-full bg-transparent border-none focus:outline-none text-xs text-slate-200 uppercase tracking-widest font-medium"
        />
      </div>

      <div className="h-6 w-px bg-white/5 hidden md:block" />

      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
        {["All", "Active", "Completed", "Archived"].map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilterChange(status)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
              statusFilter === status 
                ? "bg-[var(--ui-accent)] text-white shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.3)]" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {t(`groups.status.${status.toLowerCase()}`, status)}
          </button>
        ))}
      </div>
      
      <div className="h-6 w-px bg-white/5" />
      
      <div className="flex gap-1">
        <button 
          onClick={() => onViewModeChange("grid")}
          className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400")}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onViewModeChange("list")}
          className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]" : "text-slate-600 hover:text-slate-400")}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
