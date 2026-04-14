import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, Clock, ArrowUpRight, Users, X, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button, Badge } from "../ui";
import { NotificationType } from "../../types";
import { useNotifications, useNotificationMutations } from "../../queries/useNotificationQueries";
import { usePendingStudentRequests } from "../../queries/useEngineerQueries";
import { useAuthStore } from "../../store/stores";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  
  const { data: notifData } = useNotifications();
  const notifications = notifData?.notifications || [];
  const baseUnreadCount = notifData?.unreadCount || 0;
  
  const { data: pendingRequestsData } = usePendingStudentRequests();
  const pendingRequests = user?.role === "Engineer" || user?.role === "Admin" ? (pendingRequestsData || []) : [];
  
  const unreadCount = baseUnreadCount + pendingRequests.length;
  
  const { markAsReadMutation, markAllAsReadMutation } = useNotificationMutations();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-mark all as read disabled to avoid state flickering with pending requests
  // useEffect(() => {
  //   if (isOpen && unreadCount > 0) {
  //     markAllAsReadMutation.mutate();
  //   }
  // }, [isOpen]);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "Success": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "Warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "Error": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-brand-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5 group/bell"
      >
        <Bell className={cn("w-5 h-5 transition-all duration-300", unreadCount > 0 && "animate-bell-ring text-red-500")} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-lg bg-red-600 text-[8px] font-black text-white border-2 border-slate-950 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce-subtle">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 mt-4 w-[calc(100vw-2rem)] md:w-[420px] bg-slate-950/90 border border-white/10 rounded-[2.5rem] shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl shadow-brand-500/5 ring-1 ring-white/10"
          >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
               <div className="w-1.5 h-6 bg-brand-500 rounded-full shadow-glow" />
               <h3 className="text-[11px] font-sora font-black uppercase tracking-[0.2em] text-white">Alert Matrix</h3>
            </div>
            {unreadCount > 0 && (
              <button 
                className="h-8 px-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2"
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle className="w-3 h-3" />
                Intercept All
              </button>
            )}
          </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {pendingRequests.length > 0 && (
                <div className="mb-2 border-b border-white/5 pb-2">
                  <div className="px-6 py-2 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Join Requests
                    </h4>
                    <Badge variant="success" className="text-[8px] animate-pulse">Action Required</Badge>
                  </div>
                  <div className="divide-y divide-white/5">
                    {pendingRequests.map((req: any) => (
                      <motion.div 
                        key={req.id} 
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-6 py-5 transition-all flex gap-4 group bg-emerald-500/5 hover:bg-emerald-500/10 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-glow opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-glow shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-[13px] font-sora font-black tracking-tight text-white uppercase">{req.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                              Wants to join <span className="text-emerald-400 font-bold">{req.groupName}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 opacity-60 text-[9px] font-medium text-slate-500">
                               <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{req.username}</span>
                               <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{req.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button 
                              size="sm"
                              className="h-8 px-4 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 active:scale-95 transition-all w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false); // Close notification center
                                navigate(`/control-tower/engineer?tab=students&requestId=${req.id}`);
                              }}
                            >
                              View Request <ArrowUpRight className="w-3 h-3 ml-1.5 opacity-60" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

            {notifications.length === 0 && pendingRequests.length === 0 ? (
              <div className="p-16 text-center space-y-6 opacity-30">
                <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center mx-auto border border-white/5">
                    <Bell className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Active Alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "px-6 py-4 transition-all flex gap-4 group cursor-default relative overflow-hidden",
                      n.isRead ? "opacity-40" : "bg-brand-500/[0.02] hover:bg-brand-500/[0.04]"
                    )}
                  >
                    {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 shadow-glow" />}
                    <div className="shrink-0 mt-1">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0",
                          n.type === "Success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                          n.type === "Warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                          n.type === "Error" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                          "bg-brand-500/10 border-brand-500/20 text-brand-500"
                        )}>
                           {getTypeIcon(n.type)}
                        </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-[13px] font-sora font-black tracking-tight", !n.isRead ? "text-white" : "text-slate-400 uppercase")}>{n.title}</p>
                        {!n.isRead && (
                          <button 
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all border border-white/5 hover:border-emerald-500/20"
                            title="Intercept Directive"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-400 leading-relaxed font-black opacity-80">{n.message}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                           {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
             <button className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-brand-500 transition-colors flex items-center justify-center gap-3 mx-auto group">
               Telemetry Archive
               <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
             </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
