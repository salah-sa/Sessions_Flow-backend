import React, { useEffect } from "react";
import { 
  Bell, 
  X, 
  Clock, 
  UserPlus, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  CheckCircle2,
  ExternalLink,
  Info,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { 
  Button, 
} from "../ui";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useNotifications, 
  useNotificationMutations 
} from "../../queries/useNotificationQueries";
import { Notification as NotificationType } from "../../types";

const NotificationCenter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: notificationData, isLoading } = useNotifications();
  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;
  const { markAsReadMutation, markAllAsReadMutation } = useNotificationMutations();

  // Optimized Auto-Read Logic: Mark all as read immediately when panel opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  }, [isOpen, unreadCount, markAllAsReadMutation]);

  const handleNotificationClick = (n: NotificationType) => {
    if (!n.isRead) {
      markAsReadMutation.mutate(n.id);
    }

    const titleLower = n.title.toLowerCase();
    const msgLower = n.message.toLowerCase();
    const isJoinRequest = titleLower.includes("join") || titleLower.includes("request") || msgLower.includes("join");

    if (isJoinRequest) {
      onClose();
      if (user?.role === "Admin") {
        navigate("/admin?tab=students");
      } else if (user?.role === "Engineer") {
        navigate("/staff");
      }
    } else if (n.link) {
      navigate(n.link);
      onClose();
    }
  };

  const getNotificationIcon = (n: NotificationType) => {
    const title = n.title.toLowerCase();
    const type = n.type;

    if (title.includes("student join") || title.includes("registered")) return <UserPlus className="w-4 h-4 text-emerald-400" />;
    if (title.includes("engineer") || title.includes("staff")) return <ShieldCheck className="w-4 h-4 text-[var(--ui-accent)]" />;
    if (type === "Error") return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    if (type === "Success") return <Zap className="w-4 h-4 text-emerald-400" />;
    if (type === "Warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Bell className="w-4 h-4 text-slate-400" />;
  };

  const getCardStyles = (n: NotificationType) => {
    if (!n.isRead) {
      return "bg-white/[0.04] border-[var(--ui-accent)]/20 shadow-lg shadow-[var(--ui-accent)]/5 ring-1 ring-[var(--ui-accent)]/10";
    }
    return "bg-transparent border-white/[0.03] opacity-60 hover:opacity-100";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:backdrop-blur-[2px]" 
          />
          
          <motion.div 
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="relative w-full max-w-[420px] h-full bg-[var(--ui-sidebar-bg)] border-s border-white/5 shadow-2x-strong overflow-hidden flex flex-col"
          >
            {/* Header with Glass Effect */}
            <div className="px-8 py-8 border-b border-white/5 bg-black/20 backdrop-blur-3xl relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[var(--ui-accent)]" />
                  </div>
                  {t("notifications.title", "Intelligence Feed")}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn("w-1 h-1 rounded-full", unreadCount > 0 ? "bg-[var(--ui-accent)] animate-pulse" : "bg-slate-600")} />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {unreadCount} {t("notifications.unread", "Pending Pulses")}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10 bg-gradient-to-b from-transparent to-black/10">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("common.loading")}</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((n, i) => (
                    <motion.div
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "p-4 rounded-2xl transition-all border group relative cursor-pointer overflow-hidden",
                        getCardStyles(n)
                      )}
                    >
                      {!n.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ui-accent)] shadow-glow" />
                      )}
                      
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500">
                          {getNotificationIcon(n)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-widest leading-none truncate group-hover:text-[var(--ui-accent)] transition-colors">
                              {n.title}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0 opacity-40">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[9px] font-mono font-bold text-slate-400">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false })}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2 line-clamp-2 italic opacity-80 group-hover:opacity-100 transition-opacity">
                            {n.message}
                          </p>

                          <div className="mt-3 flex items-center justify-between border-t border-white/[0.02] pt-2">
                             <div className="flex items-center gap-2">
                               <Info className="w-3 h-3 text-slate-600" />
                               <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                                  ID: {n.id.slice(-8)}
                               </span>
                             </div>
                             
                             {(n.title.toLowerCase().includes("join") || n.message.toLowerCase().includes("join")) && (
                               <div className="flex items-center gap-1.5 text-[var(--ui-accent)] text-[9px] font-black uppercase tracking-widest animate-pulse">
                                  <span>{t("common.actions", "Navigate")}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center px-12 text-center">
                   <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 relative">
                      <Bell className="w-8 h-8 text-slate-700 opacity-20" />
                      <div className="absolute inset-0 rounded-full bg-[var(--ui-accent)]/5 animate-ping duration-[3s]" />
                   </div>
                   <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2 opacity-50">{t("notifications.empty_title", "Void Channel")}</h3>
                   <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">{t("notifications.empty_desc", "All neural pulses have been synchronized.")}</p>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col gap-3 relative z-10 backdrop-blur-xl">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 !h-11 !rounded-xl !text-[9px] !font-black !uppercase !tracking-[0.2em] !border-white/5 !bg-white/[0.02] hover:!bg-white/5 group" 
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 me-2 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  {t("notifications.mark_all", "Sync All")}
                </Button>
                <Button 
                  variant="outline" 
                  className="!w-12 !h-11 !rounded-xl !p-0 !border-white/5 !bg-white/[0.02] hover:!bg-rose-500/10 hover:!border-rose-500/20 group" 
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-500 transition-colors" />
                </Button>
              </div>
              <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.3em] text-center">
                Protocol v3.4.2 — System Logs Active
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
