import React from "react";
import { Users, Plus, Edit2, Trash2, Loader2, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { GroupCard } from "./GroupCard";
import { Group } from "../../types";

interface GroupListProps {
  groups: Group[];
  loading: boolean;
  viewMode: "grid" | "list";
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAddStudent: (group: Group) => void;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  loading,
  viewMode,
  onEdit,
  onDelete,
  onAddStudent
}) => {
  const { t } = useTranslation();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 animate-stagger-3">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8 pt-4"
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[280px] md:h-[380px] rounded-2zl bg-white/[0.02] border border-white/5 animate-pulse" />
            ))}
          </motion.div>
        ) : groups.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-20 flex flex-col items-center justify-center space-y-6 opacity-30"
          >
            <div className="p-8 rounded-full bg-white/[0.02] border border-white/5">
              <Users className="w-16 h-16 text-white" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-white uppercase tracking-tighter">{t("groups.empty.title")}</p>
              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">{t("groups.empty.subtitle")}</p>
            </div>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div 
            key="grid"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8 pt-4"
          >
            {groups.map((group, index) => (
              <GroupCard 
                key={group.id} 
                group={group} 
                index={index} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onAddStudent={onAddStudent} 
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="card-base !p-0 overflow-hidden border-white/5 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl"
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-start border-collapse min-w-[600px] md:min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                    <th className="px-4 md:px-8 py-4 md:py-6 text-start">{t("groups.wizard.step1.name")}</th>
                    <th className="px-4 md:px-8 py-4 md:py-6 text-center hidden sm:table-cell">{t("groups.modal.students")}</th>
                    <th className="px-4 md:px-8 py-4 md:py-6 text-center">{t("groups.wizard.step1.level")}</th>
                    <th className="px-4 md:px-8 py-4 md:py-6 text-start hidden md:table-cell">{t("groups.card.next_session")}</th>
                    <th className="px-4 md:px-8 py-4 md:py-6 text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {groups.map((group, index) => (
                    <motion.tr 
                      key={group.id} 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b last:border-none border-white/5 hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[var(--ui-accent)] shadow-[0_0_10px_rgba(var(--ui-accent-rgb),0.5)] shrink-0" />
                          <span className="font-bold text-slate-300 group-hover:text-white transition-colors truncate max-w-[150px] md:max-w-none">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6 text-center text-slate-500 font-bold tabular-nums hidden sm:table-cell">{group.studentCount ?? group.students?.length ?? 0}</td>
                      <td className="px-4 md:px-8 py-4 md:py-6 text-center">
                        <div className="inline-flex h-6 px-3 rounded-md bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[9px] font-bold uppercase tracking-widest items-center border border-[var(--ui-accent)]/20 shrink-0">
                           LVL {group.level}
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6 hidden md:table-cell">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">
                          {group.nextSession ? new Date(group.nextSession).toLocaleDateString() : t("common.none")}
                        </span>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6 text-end">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => onAddStudent(group)}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--ui-accent)] hover:bg-white/5 transition-all"
                          >
                             <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onEdit(group)}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(group)}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
