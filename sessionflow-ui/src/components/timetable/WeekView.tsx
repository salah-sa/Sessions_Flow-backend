import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay, isAfter } from "date-fns";
import { Calendar as CalendarIcon, Clock, Plus, Zap, Archive, Layers } from "lucide-react";
import { cn } from "../../lib/utils";
import { Session } from "../../types";

interface WeekViewProps {
  sessions: Session[];
  currentDate: Date;
  onAddSession: (date: Date) => void;
  onViewSession: (session: Session) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 to 22:00

export const WeekView: React.FC<WeekViewProps> = ({ sessions, currentDate, onAddSession, onViewSession }) => {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const calculateTop = (date: Date) => {
    const hour = date.getHours();
    const minutes = date.getMinutes();
    return (hour - 9) * 96 + (minutes / 60) * 96;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl relative">
      {/* Header Matrix */}
      <div className="grid grid-cols-8 border-b border-white/10 bg-slate-900/40 sticky top-0 z-20 backdrop-blur-3xl">
        <div className="p-6 border-r border-white/5 flex items-center justify-center bg-slate-950/20">
           <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 shadow-glow shadow-brand-500/5">
              <Clock className="w-5 h-5 text-brand-500" />
           </div>
        </div>
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={i} 
              className={cn(
                "p-6 text-center border-r border-white/5 last:border-r-0 transition-all duration-700 relative group/day overflow-hidden",
                isToday ? "bg-brand-500/5" : ""
              )}
            >
              {isToday && (
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-glow animate-pulse" />
              )}
              <p className={cn(
                "text-[9px] font-black uppercase tracking-[0.4em] mb-2 transition-colors", 
                isToday ? "text-brand-400" : "text-slate-600 group-hover/day:text-slate-400"
              )}>
                 {format(day, "EEEE")}
              </p>
              <p className={cn(
                "text-lg font-sora font-black tracking-tighter tabular-nums", 
                isToday ? "text-white" : "text-slate-400 group-hover/day:text-slate-200"
              )}>
                 {format(day, "MMM dd")}
              </p>
              {isToday && (
                 <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-brand-500 shadow-glow" />
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Matrix */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.05),transparent_60%)] [perspective:2500px]">
        {/* Antigravity 3D Grid Plane */}
        <div className="grid grid-cols-8 min-h-[1344px] relative [transform-style:preserve-3d] [transform:rotateX(4deg)_rotateY(-1deg)_scale(0.98)] origin-top group/matrix transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] hover:[transform:rotateX(0deg)_rotateY(0deg)_scale(1)]">
          
          {/* Spatial Grid Background Base */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:96px_96px] [transform:translateZ(-50px)] pointer-events-none" />

          {/* Real-time Temporal Line */}
          {weekDays.some(day => isSameDay(day, now)) && (
            <div 
              className="absolute left-0 right-0 z-10 pointer-events-none flex items-center group/timeline [transform:translateZ(10px)]"
              style={{ top: `${calculateTop(now)}px` }}
            >
               <div className="w-[12.5%] flex justify-end pr-4">
                  <span className="bg-brand-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full shadow-glow animate-pulse">
                    {format(now, "HH:mm")}
                  </span>
               </div>
               <div className="flex-1 h-px bg-brand-500/80 relative shadow-glow">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-500 shadow-glow animate-ping" />
                  <div className="absolute inset-0 bg-brand-400/20 blur-sm" />
               </div>
            </div>
          )}

          {/* Time scale column */}
          <div className="border-r border-white/5 bg-slate-950/60 sticky left-0 z-10 backdrop-blur-xl shadow-2xl [transform:translateZ(5px)] border-r-white/10">
            {HOURS.map((hour) => (
              <div key={hour} className="h-24 border-b border-white/[0.03] flex flex-col items-center justify-start pt-6 space-y-1.5 group/hour transition-all">
                <span className="text-[11px] font-black text-white/50 tabular-nums tracking-tighter group-hover/hour:text-brand-400 group-hover/hour:scale-125 group-hover/hour:-rotate-6 transition-all duration-500">
                  {hour > 12 ? `${hour - 12}` : hour}:00
                </span>
                <span className="text-[7px] font-black text-brand-500/50 uppercase tracking-[0.3em] font-mono group-hover/hour:text-brand-400 transition-colors duration-500">
                  {hour >= 12 ? "PM" : "AM"}
                </span>
              </div>
            ))}
          </div>

          {/* Individual Day columns */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="relative border-r border-white/5 last:border-r-0 group/col hover:bg-brand-500/[0.02] transition-colors duration-700 [transform-style:preserve-3d]">
              {HOURS.map((hour) => (
                <div 
                  key={hour} 
                  className="h-24 border-b border-white/[0.03] relative group/slot cursor-pointer transition-all hover:bg-brand-500/[0.05] active:bg-brand-500/10"
                  onClick={() => {
                    const date = new Date(day);
                    date.setHours(hour, 0, 0, 0);
                    onAddSession(date);
                  }}
                >
                  <div className="absolute inset-2 rounded-xl border border-dashed border-brand-500/30 opacity-0 group-hover/slot:opacity-100 transition-all flex items-center justify-center scale-75 group-hover/slot:scale-100 bg-brand-500/5 backdrop-blur-sm [transform:translateZ(20px)] shadow-[0_0_20px_rgba(56,189,248,0.1)]">
                     <Plus className="w-6 h-6 text-brand-400" />
                  </div>
                </div>
              ))}

              {/* Sessions Layer: Elevating objects in Z-space */}
              {sessions
                .filter((s) => isSameDay(new Date(s.scheduledAt), day))
                .map((session) => {
                  const sDate = new Date(session.scheduledAt);
                  const isFuture = isAfter(sDate, now);
                  const isProjected = isFuture && session.status === "Scheduled";
                  
                  const top = calculateTop(sDate);
                  const duration = 60; // default 1h
                  const height = 92; // 96 - margin

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "absolute left-3 right-3 rounded-[1.25rem] p-4 border transition-all hover:!scale-[1.08] active:scale-95 group/session z-20 shadow-[-10px_20px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl [transform:translateZ(40px)] hover:[transform:translateZ(80px)] duration-[0.6s] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        session.status === "Active" 
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] animate-pulse-subtle border-glow" :
                        session.status === "Ended" 
                          ? "bg-slate-900/40 border-slate-700/50 text-slate-500 grayscale opacity-70 hover:opacity-100 hover:grayscale-0 shadow-[0_10px_30px_rgba(0,0,0,0.8)]" :
                        isProjected 
                          ? "bg-brand-500/10 border border-brand-500/30 text-brand-300 shadow-[inset_0_0_20px_rgba(56,189,248,0.1),0_10px_20px_rgba(0,0,0,0.6)]" :
                        "bg-brand-500/20 border-brand-500/40 text-brand-400 shadow-[0_20px_40px_-5px_rgba(56,189,248,0.2)] border-glow"
                      )}
                      style={{ top: `${top + 4}px`, height: `${height}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSession(session);
                      }}
                    >
                      <div className="flex flex-col h-full relative overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-2">
                           <div className="min-w-0">
                             <div className="flex items-center gap-1.5 mb-1.5">
                                {isProjected ? <Zap className="w-3 h-3 text-brand-400" /> : <Layers className="w-3 h-3 text-current opacity-60" />}
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] font-mono text-inherit opacity-60">
                                   {isProjected ? "PROJECTED_NODE" : `SID-${session.sessionNumber}`}
                                </p>
                             </div>
                             <p className="text-[14px] font-sora font-black truncate text-white leading-none uppercase tracking-tight drop-shadow-md">
                                {session.group?.name || "Ready"}
                             </p>
                           </div>
                           <div className={cn(
                             "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-700 group-hover/session:rotate-[360deg]",
                             session.status === "Active" 
                               ? "bg-emerald-500/20 border-emerald-500/50 shadow-glow shadow-emerald-500/20" 
                               : "bg-white/10 border-white/20 group-hover/session:bg-brand-500/20 group-hover/session:border-brand-500"
                           )}>
                              {session.status === "Active" ? (
                                <div className="relative">
                                  <Clock className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                                  <div className="absolute inset-0 bg-emerald-500/60 blur-md rounded-full animate-pulse" />
                                </div>
                              ) : isProjected ? (
                                <Plus className="w-4 h-4 text-brand-300" />
                              ) : (
                                <Archive className="w-4 h-4 opacity-70 group-hover/session:text-brand-300" />
                              )}
                           </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                           <div className="flex items-center gap-1.5 text-[9px] font-black tabular-nums tracking-widest bg-black/40 px-2 py-1 rounded-md border border-white/10 shadow-inner">
                             <Clock className="w-3 h-3 opacity-70" />
                             {format(sDate, "h:mm a")}
                           </div>
                           
                           {session.status === "Active" && (
                              <div className="flex gap-1.5 items-center px-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)] animate-ping" />
                                 <span className="text-[7px] font-black uppercase tracking-[0.3em] font-mono text-emerald-400 drop-shadow-md">Live</span>
                              </div>
                           )}
                        </div>

                        {/* Interactive Sparkle Effect overlay on hover */}
                        <div className="absolute -inset-x-20 -inset-y-10 bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover/session:opacity-100 transition-all duration-[1s] group-hover/session:translate-x-[200px] pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
