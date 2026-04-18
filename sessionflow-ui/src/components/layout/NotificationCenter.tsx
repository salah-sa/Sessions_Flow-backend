import React from "react";
import { 
  Bell, 
  Trash2, 
  Clock, 
  Zap,
  Box
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  Button, 
  Badge, 
  Card
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
  const { data: notificationData } = useNotifications();
  const notifications = notificationData?.notifications || [];
  const { markAsReadMutation, markAllAsReadMutation } = useNotificationMutations();
  
  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handlePurge = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          />
          
          <motion.div 
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="relative w-full max-w-[420px] h-full bg-[var(--ui-sidebar-bg)]/95 backdrop-blur-3xl border-s border-white/5 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--ui-accent)]/5 blur-[100px] pointer-events-none" />

            <div className="px-10 py-10 border-b border-white/5 flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[var(--ui-accent)]" />
                  Internal Alerts
                </h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Protocol Notification System</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-white/5"><Trash2 className="w-4 h-4 text-slate-500" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative z-10">
              {notifications.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className={cn(
                        "p-6 rounded-2xl transition-all border group relative cursor-pointer",
                        n.isRead 
                          ? "bg-transparent border-white/[0.03] opacity-40 hover:opacity-60" 
                          : "bg-white/[0.02] border-white/10 hover:border-white/20"
                      )}
                    >
                      {!n.isRead && (
                        <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-[var(--ui-accent)] shadow-glow" />
                      )}
                      
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          n.type === "Success" ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : 
                          n.type === "Error" ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                          "bg-white/[0.05] border-white/10 text-slate-400"
                        )}>
                          {n.type === "Success" ? <Zap className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-widest mb-1">{n.title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-2 mt-4">
                             <Clock className="w-3 h-3 text-slate-700" />
                             <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                                {new Date(n.createdAt).toLocaleTimeString()}
                             </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center opacity-20">
                   <Bell className="w-12 h-12 text-slate-500 mb-4" />
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Alerts In Queue</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4 relative z-10">
              <Button variant="secondary" className="flex-1 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest" onClick={handleMarkAllAsRead}>Mark All Read</Button>
              <Button variant="primary" className="flex-1 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest" onClick={handlePurge}>Purge Archive</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
