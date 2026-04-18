import React from "react";
import { Users, Edit2, Trash2, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Group } from "../../types";

interface GroupCardProps {
  group: Group;
  index: number;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAddStudent: (group: Group) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  index, 
  onEdit, 
  onDelete, 
  onAddStudent 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative w-full h-[380px]"
    >
      <div className="card-base absolute inset-0 flex flex-col group transition-all duration-500 border-white/5 hover:border-[var(--ui-accent)]/40 shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-accent)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="p-8 space-y-8 flex-1 relative z-20">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-[var(--ui-accent)] shadow-inner transition-transform group-hover:scale-105">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(group)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(group)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <h3 className="text-2xl font-bold text-white tracking-tighter truncate">{group.name}</h3>
               <div className="h-5 px-3 rounded-md bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[9px] font-bold uppercase tracking-[0.2em] flex items-center border border-[var(--ui-accent)]/20">
                 LVL {group.level}
               </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed line-clamp-2">{group.description || t("common.none")}</p>
          </div>

          <div className="flex items-center gap-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-16 h-16 flex items-center justify-center drop-shadow-2xl">
                  <svg className="w-full h-full -rotate-90 transform">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="188.5" strokeDashoffset={188.5 - (Math.min(1, (group.studentCount ?? group.students?.length ?? 0) / group.numberOfStudents) * 188.5)} className="text-[var(--ui-accent)] transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-lg font-bold text-white">
                    {group.studentCount ?? group.students?.length ?? 0}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("groups.card.enrollment")}</p>
                  <p className="text-[11px] font-bold text-white uppercase tabular-nums">{group.numberOfStudents} SLOTS</p>
                </div>
              </div>
            <div className="w-px h-12 bg-white/5" />
            <div className="space-y-3 flex-1 ps-2">
               <div className="flex justify-between items-end">
                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("groups.card.progression")}</p>
                 <p className="text-sm font-bold text-[var(--ui-accent)]">{group.currentSessionNumber} / {group.totalSessions}</p>
               </div>
               <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden relative border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--ui-accent)]/80 to-[var(--ui-accent)] transition-all duration-1000 shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.3)]" 
                    style={{ width: `${Math.min(100, ((group.currentSessionNumber - 1) / group.totalSessions) * 100)}%` }}
                  />
               </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-between mt-auto">
          <div className="space-y-1">
             <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t("groups.card.next_session")}</p>
             <p className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">
              {group.nextSession 
                ? `${format(new Date(group.nextSession), "MMM dd • h:mm a")}` 
                : t("groups.card.no_session")}
             </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => onAddStudent(group)} className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/5 text-slate-400 hover:text-[var(--ui-accent)] hover:border-[var(--ui-accent)]/30 transition-all">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(`/groups/${group.id}/sessions`)} className="btn-primary !h-10 !px-6 !text-[9px]">
              {t("groups.card.manage")} <ChevronRight className="w-3.5 h-3.5 ms-2" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
