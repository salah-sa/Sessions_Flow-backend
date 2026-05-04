import React, { useMemo } from "react";
import { Users, Volume2, VolumeX, ChevronDown, Shield, Pencil, ChevronLeft, Zap, Activity, Info, Phone, PhoneOff } from "lucide-react";
import { cn, getTierBorderClass, getStudentBorderStyle } from "../../lib/utils";
import { Group, User } from "../../types";
import { usePresenceStore } from "../../store/presenceStore";
import { useAuthStore, useChatStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface GroupHeaderProps {
  group: Group;
  onToggleMembers: () => void;
  onToggleMute: () => void;
  onEditDescription?: () => void;
  onStartCall?: () => void;
  canCall?: boolean;
  isMuted: boolean;
  membersOpen: boolean;
}

const PresenceDot: React.FC<{ userId: string; size?: "sm" | "md" }> = ({ userId, size = "sm" }) => {
  const status = usePresenceStore((s) => s.getPresence(userId).status);
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  
  let bgColor = "bg-[var(--ui-surface)]"; // offline
  let shadow = "";
  
  if (status === "online") {
    bgColor = "bg-[var(--ui-accent)]";
    shadow = "shadow-[0_0_10px_rgba(var(--ui-accent-rgb),0.6)]";
  } else if (status === "away") {
    bgColor = "bg-[#7c3aed]";
    shadow = "shadow-[0_0_8px_rgba(124,58,237,0.4)]";
  }
  
  return (
    <div className={cn(
      dotSize,
      "rounded-full border border-[var(--ui-bg)] transition-all duration-500 relative",
      bgColor,
      shadow
    )}>
      {status === "online" && (
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-[var(--ui-accent)]"
        />
      )}
    </div>
  );
};

const MemberAvatar: React.FC<{
  name: string;
  userId: string;
  studentId?: string;
  avatarUrl?: string | null;
  isEngineer?: boolean;
  subscriptionTier?: string;
}> = ({ name, userId, studentId, avatarUrl, isEngineer, subscriptionTier }) => {
  return (
    <div className="relative group/avatar" title={name}>
      <div
        className={cn("rounded-full", (isEngineer || subscriptionTier?.toLowerCase() === 'ultra' || ['ultra', 'pro', 'enterprise'].includes(subscriptionTier?.toLowerCase() || "")) ? getTierBorderClass(subscriptionTier, isEngineer ? "Engineer" : undefined) : "")}
        style={(!isEngineer && !['ultra', 'pro', 'enterprise'].includes(subscriptionTier?.toLowerCase() || "")) ? getStudentBorderStyle(userId) : undefined}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold uppercase overflow-hidden transition-all duration-300 hover:scale-110 hover:z-20 relative z-10",
          isEngineer ? "bg-[var(--ui-accent)]/10 text-white" : "bg-[var(--ui-sidebar-bg)] text-slate-500"
        )}>
          {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : name?.charAt(0)}
        </div>
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
  onStartCall,
  canCall = false,
  isMuted,
  membersOpen,
}) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isArchived = group.status === "Completed" || group.status === "Archived";
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
        // Prioritize records with a userId (linked to an account)
        if (!existing || (!existing.userId && s.userId)) {
          uniqueStudentsMap.set(key, s);
        }
      });

      Array.from(uniqueStudentsMap.values()).forEach(s => {
        result.push({ id: s.id, userId: s.userId || s.id, name: s.name, isEngineer: false, studentId: s.id });
      });
    }
    return result;
  }, [group]);

  const onlineCount = useMemo(() => members.filter((m) => isOnlineFunc(m.userId)).length, [members, isOnlineFunc]);
  const visibleAvatars = members.slice(0, 5);
  const overflow = members.length - visibleAvatars.length;

  return (
    <div className="relative px-3 py-2.5 xs:py-3 md:px-6 md:py-4 lg:px-8 lg:py-5 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border-b border-white/5 flex-none z-20">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-accent)]/40 to-transparent" />

      <div className="flex items-center justify-between gap-2 xs:gap-3 md:gap-6">
        <button 
          onClick={() => useChatStore.getState().setActiveGroup(null)} 
          className="lg:hidden p-2.5 rounded-xl text-slate-500 hover:text-white bg-white/[0.02] border border-white/5 transition-all shrink-0 touch-target-min"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 xs:gap-3 md:gap-5 min-w-0 flex-1">
          <div className="w-9 h-9 xs:w-10 xs:h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--ui-accent)]/20 to-[#7c3aed]/10 border border-[var(--ui-accent)]/30 flex items-center justify-center text-white font-bold text-[10px] xs:text-xs shadow-glow shadow-[var(--ui-accent)]/10">
            L{group.level}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 xs:gap-3">
              <h2 className="text-xs xs:text-sm md:text-base font-bold text-white uppercase tracking-widest truncate leading-none">
                {group.name}
              </h2>
              {isArchived && (
                <span className="text-[7px] font-bold text-[var(--ui-accent)] bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 px-1.5 xs:px-2 py-0.5 rounded-md uppercase tracking-[0.2em] shrink-0">
                  ARCHIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 xs:gap-3 mt-1.5 opacity-60">
              <span className="text-[8px] xs:text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {members.length} <span className="hidden xs:inline">USERS</span>
              </span>
              <div className="w-1 h-1 rounded-full bg-[var(--ui-surface)]" />
              <div className="flex items-center gap-1.5 text-[8px] xs:text-[9px] font-bold text-[var(--ui-accent)] uppercase tracking-[0.2em]">
                <Activity className="w-3 h-3" />
                {onlineCount} <span className="hidden xs:inline">ACTIVE</span>
              </div>
            </div>

            {group.description && (
              <div className="hidden md:flex items-center gap-3 mt-2">
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest truncate max-w-md">
                  {group.description}
                </p>
                {canEdit && onEditDescription && (
                  <button onClick={onEditDescription} className="text-slate-700 hover:text-[var(--ui-accent)] transition-colors"><Pencil className="w-3 h-3" /></button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center">
          {/* md-lg: show max 3 avatars */}
          <div className="flex -space-x-3 lg:hidden">
            {members.slice(0, 3).map((m) => (
              <MemberAvatar key={m.id} name={m.name} userId={m.userId} studentId={m.studentId} isEngineer={m.isEngineer} subscriptionTier={user?.subscriptionTier} />
            ))}
            {members.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-[var(--ui-sidebar-bg)] border border-white/10 flex items-center justify-center text-[8px] font-bold text-slate-500 relative z-10">
                +{members.length - 3}
              </div>
            )}
          </div>
          {/* lg+: show max 5 avatars */}
          <div className="hidden lg:flex -space-x-3">
            {visibleAvatars.map((m) => (
              <MemberAvatar key={m.id} name={m.name} userId={m.userId} studentId={m.studentId} isEngineer={m.isEngineer} subscriptionTier={user?.subscriptionTier} />
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-full bg-[var(--ui-sidebar-bg)] border border-white/10 flex items-center justify-center text-[8px] font-bold text-slate-500 relative z-10">
                +{overflow}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 shrink-0">
          {/* Group Call — Engineers only */}
          {canEdit && (
            canCall && onStartCall ? (
              <button
                onClick={onStartCall}
                className="w-10 h-10 xs:w-11 xs:h-11 rounded-xl flex items-center justify-center transition-all border shrink-0 touch-target-min bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                title="Start Group Call"
              >
                <Phone className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled
                className="w-10 h-10 xs:w-11 xs:h-11 rounded-xl flex items-center justify-center transition-all border shrink-0 touch-target-min bg-white/[0.02] border-white/5 text-slate-700 cursor-not-allowed"
                title="Upgrade to Pro/Ultra for group calls"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            )
          )}
          <button onClick={onToggleMute} className={cn("w-10 h-10 xs:w-11 xs:h-11 rounded-xl flex items-center justify-center transition-all border shrink-0 touch-target-min", isMuted ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-[var(--ui-accent)] hover:border-[var(--ui-accent)]/20")}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onToggleMembers} className={cn("h-10 xs:h-11 px-2.5 xs:px-3 md:px-5 rounded-xl flex items-center gap-2 md:gap-3 transition-all border font-bold text-[9px] uppercase tracking-widest shrink-0 touch-target-min", membersOpen ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/40 text-[var(--ui-accent)]" : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-white hover:border-white/10")}>
            <Users className="w-4 h-4" />
            <span className="hidden xs:inline">{members.length} <span className="hidden md:inline ms-1">{t("chat.members") || "Members"}</span></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupHeader;

