import React, { useMemo } from "react";
import { Users, Volume2, VolumeX, Shield, Pencil, ChevronLeft, Activity, Info, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";
import { Group } from "../../types";
import { usePresenceStore } from "../../store/presenceStore";
import { useAuthStore, useChatStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface GroupHeaderProps {
  group: Group;
  onToggleMembers: () => void;
  onToggleMute: () => void;
  onEditDescription?: () => void;
  isMuted: boolean;
  membersOpen: boolean;
}

const PresenceDot: React.FC<{ userId: string; size?: "sm" | "md" }> = ({ userId, size = "sm" }) => {
  const status = usePresenceStore((s) => s.getPresence(userId).status);
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  
  const isOnline = status === "active";
  const isAway = status === "idle" || status === "hidden";
  
  return (
    <div className={cn(
      dotSize,
      "rounded-full border-2 border-[#12141a] transition-all duration-500 relative",
      isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : 
      isAway ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : 
      "bg-slate-700"
    )}>
      {isOnline && (
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-emerald-400"
        />
      )}
    </div>
  );
};

const MemberAvatar: React.FC<{
  name: string;
  userId: string;
  avatarUrl?: string | null;
  isEngineer?: boolean;
}> = ({ name, userId, avatarUrl, isEngineer }) => {
  return (
    <div className="relative group/avatar" title={name}>
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold overflow-hidden transition-all duration-300 hover:scale-110 hover:z-20 border",
        isEngineer ? "bg-[var(--chat-accent-warm)]/10 border-[var(--chat-accent-warm)]/20 text-white" : "bg-white/5 border-white/10 text-slate-400"
      )}>
        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : name?.charAt(0)}
      </div>
      <div className="absolute -bottom-0.5 -end-0.5">
        <PresenceDot userId={userId} size="sm" />
      </div>
    </div>
  );
};

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  onToggleMembers,
  onToggleMute,
  onEditDescription,
  isMuted,
  membersOpen,
}) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isCompleted = group.status === "Completed" || group.status === "Archived";
  const canEdit = user?.role === "Admin" || user?.role === "Engineer";
  const isOnlineFunc = usePresenceStore((s) => s.isOnline);

  const members = useMemo(() => {
    const result: any[] = [];
    if (group.engineerId) result.push({ id: group.engineerId, userId: group.engineerId, name: group.engineerName || "Engineer", isEngineer: true });
    
    if (group.students) {
      const uniqueStudentsMap = new Map<string, any>();
      group.students.forEach(s => {
        const key = s.name.toLowerCase().trim();
        const existing = uniqueStudentsMap.get(key);
        if (!existing || (!existing.userId && s.userId)) {
          uniqueStudentsMap.set(key, s);
        }
      });

      Array.from(uniqueStudentsMap.values()).forEach(s => {
        result.push({ id: s.id, userId: s.userId || s.id, name: s.name, isEngineer: false });
      });
    }
    return result;
  }, [group]);

  const onlineCount = useMemo(() => members.filter((m) => isOnlineFunc(m.userId)).length, [members, isOnlineFunc]);
  const visibleAvatars = members.slice(0, 5);
  const overflow = members.length - visibleAvatars.length;

  return (
    <div className="relative px-4 py-3 md:px-8 md:py-4 bg-white/[0.02] backdrop-blur-xl border-b border-white/5 flex-none z-20">
      <div className="flex items-center justify-between gap-4">
        <button 
          onClick={() => useChatStore.getState().setActiveGroup(null)} 
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-[var(--chat-accent-gradient)] opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter leading-none opacity-60">Lv</span>
            <span className="text-sm md:text-base font-bold text-white leading-none mt-0.5">{group.level}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-lg font-bold text-white font-display truncate leading-tight">
                {group.name}
              </h2>
              {isCompleted && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                  Completed
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Users className="w-3.5 h-3.5" />
                <span>{members.length} Total</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <div className="flex -space-x-3">
            {visibleAvatars.map((m) => (
              <MemberAvatar key={m.id} name={m.name} userId={m.userId} isEngineer={m.isEngineer} />
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 relative z-10">
                +{overflow}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button 
            onClick={onToggleMute} 
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center transition-all border shrink-0",
              isMuted 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={onToggleMembers} 
            className={cn(
              "h-10 md:h-11 px-4 md:px-5 rounded-2xl flex items-center gap-3 transition-all border font-bold text-[11px] uppercase tracking-widest shrink-0",
              membersOpen 
                ? "bg-[var(--chat-accent-warm)]/10 border-[var(--chat-accent-warm)]/20 text-[var(--chat-accent-warm)]" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            )}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">{t("chat.members") || "Members"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupHeader;

