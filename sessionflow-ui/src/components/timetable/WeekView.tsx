import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay, isAfter } from "date-fns";
import { Calendar as CalendarIcon, Clock, Plus, Zap, Archive, Layers } from "lucide-react";
import { cn } from "../../lib/utils";
import { Session, GroupScheduleEntry } from "../../types";

interface WeekViewProps {
  sessions: Session[];
  groupSchedules: GroupScheduleEntry[];
  currentDate: Date;
  onAddSession: (date: Date, groupId?: string) => void;
  onViewSession: (session: Session) => void;
  isStudent?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00

export const WeekView: React.FC<WeekViewProps> = ({ sessions, groupSchedules, currentDate, onAddSession, onViewSession, isStudent }) => {
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
    return hour * 96 + (minutes / 60) * 96;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--ui-sidebar-bg)]/40 rounded-xl overflow-hidden relative">
      <div className="flex-1 overflow-auto custom-scrollbar group/matrix">
         <div className="min-w-[1000px] flex flex-col h-full relative">
            {/* Header Matrix */}
            <div className="grid grid-cols-8 border-b border-white/5 bg-[var(--ui-sidebar-bg)]/80 sticky top-0 z-40 backdrop-blur-3xl">
               <div className="p-6 border-r border-white/5 flex items-center justify-center bg-black/20">
                  <div className="p-3 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/5">
                     <Clock className="w-5 h-5 text-[var(--ui-accent)]" />
                  </div>
               </div>
               {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                     <div 
                        key={i} 
                        className={cn(
                           "p-6 text-center border-r border-white/5 last:border-r-0 transition-all duration-300 relative overflow-hidden",
                           isToday ? "bg-[var(--ui-accent)]/5" : ""
                        )}
                     >
                        {isToday && (
                           <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--ui-accent)] shadow-[0_0_10px_rgba(var(--ui-accent-rgb),0.5)]" />
                        )}
                        <p className={cn(
                           "text-[8.5px] font-bold uppercase tracking-[0.3em] mb-2 transition-colors", 
                           isToday ? "text-[var(--ui-accent)]" : "text-slate-600"
                        )}>
                           {format(day, "EEEE")}
                        </p>
                        <p className={cn(
                           "text-base font-bold tracking-tight tabular-nums transition-colors", 
                           isToday ? "text-white" : "text-slate-400 group-hover/matrix:text-slate-200"
                        )}>
                           {format(day, "MMM dd")}
                        </p>
                     </div>
                  );
               })}
            </div>

            {/* Grid Area */}
            <div className="flex-1 relative">
               <div className="grid grid-cols-8 min-h-[2304px] relative bg-[var(--ui-bg)]/40">
                  
                  {/* Subtle Zenith Grid Lines */}
                  {HOURS.map((hour) => (
                    <div key={`grid-${hour}`} className="absolute left-0 right-0 h-px bg-white/[0.02] pointer-events-none" style={{ top: `${hour * 96}px` }} />
                  ))}

                  {/* Real-time Temporal Line */}
                  {weekDays.some(day => isSameDay(day, now)) && (
                     <div 
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{ top: `${calculateTop(now)}px` }}
                     >
                        <div className="w-[12.5%] flex justify-end pr-4">
                           <span className="bg-[var(--ui-accent)] text-white text-[8px] font-bold px-2 py-0.5 rounded-md shadow-glow shadow-[var(--ui-accent)]/30">
                              {format(now, "HH:mm")}
                           </span>
                        </div>
                        <div className="flex-1 h-px bg-[var(--ui-accent)]/60 relative shadow-glow shadow-[var(--ui-accent)]/20">
                           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--ui-accent)] shadow-glow" />
                        </div>
                     </div>
                  )}

                  {/* Time Scale Column */}
                  <div className="border-r border-white/5 bg-[var(--ui-sidebar-bg)]/60 sticky left-0 z-20 backdrop-blur-xl">
                     {HOURS.map((hour) => (
                        <div key={hour} className="h-24 flex flex-col items-center justify-start pt-6 space-y-1 transition-all">
                           <span className="text-[10px] font-bold text-slate-500 tabular-nums tracking-widest leading-none">
                              {hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00
                           </span>
                           <span className="text-[7px] font-bold text-slate-700 uppercase tracking-widest leading-none">
                              {hour >= 12 ? "PM" : "AM"}
                           </span>
                        </div>
                     ))}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((day, dayIndex) => (
                     <div key={dayIndex} className="relative border-r border-white/5 last:border-r-0 group/col hover:bg-white/[0.01] transition-colors duration-500">
                        {HOURS.map((hour) => (
                           <div 
                              key={hour} 
                              className={cn(
                                "h-24 relative group/slot",
                                !isStudent && "cursor-pointer"
                              )}
                              onClick={() => {
                                 if (isStudent) return;
                                 const date = new Date(day);
                                 date.setHours(hour, 0, 0, 0);
                                 onAddSession(date);
                              }}
                           >
                               {!isStudent && (
                                 <div className="absolute inset-1.5 rounded-lg border border-dashed border-[var(--ui-accent)]/20 opacity-0 group-hover/slot:opacity-100 transition-all flex items-center justify-center bg-[var(--ui-accent)]/5 backdrop-blur-sm scale-95 group-hover/slot:scale-100">
                                   <Plus className="w-4 h-4 text-[var(--ui-accent)]/40" />
                                 </div>
                               )}
                           </div>
                        ))}

                        {/* Schedule Blueprints (The Matrix) */}
                        {groupSchedules
                           .filter(gs => gs.dayOfWeek === dayIndex)
                           .map((gs, idx) => {
                              const [hours, minutes] = gs.startTime.split(":").map(Number);
                              const top = hours * 96 + (minutes / 60) * 96;
                              const height = (gs.durationMinutes / 60) * 96;
                              
                              return (
                                 <div
                                    key={`blueprint-${idx}`}
                                    onClick={() => {
                                       if (isStudent) return;
                                       const date = new Date(day);
                                       date.setHours(hours, minutes, 0, 0);
                                       onAddSession(date, gs.groupId);
                                    }}
                                    className={cn(
                                      "absolute left-2.5 right-2.5 rounded-xl border-2 border-dashed border-white/5 bg-white/[0.01] transition-all z-0 flex flex-col p-3 overflow-hidden",
                                      !isStudent ? "hover:border-[var(--ui-accent)]/30 hover:bg-[var(--ui-accent)]/5 cursor-pointer group/blueprint" : ""
                                    )}
                                    style={{ top: `${top + 3}px`, height: `${height - 6}px` }}
                                 >
                                    <div className="flex items-center justify-between opacity-30 group-hover/blueprint:opacity-100 transition-opacity">
                                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80%]">
                                          {gs.groupName}
                                       </span>
                                       {!isStudent && <Plus className="w-2.5 h-2.5 text-[var(--ui-accent)]" />}
                                    </div>
                                    <div className="mt-auto opacity-20 group-hover/blueprint:opacity-40 transition-opacity">
                                       <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">
                                          Template Matrix
                                       </span>
                                    </div>
                                 </div>
                              );
                           })}

                        {/* Session Cards */}
                        {sessions
                           .filter((s) => isSameDay(new Date(s.scheduledAt), day))
                           .map((session) => {
                              const sDate = new Date(session.scheduledAt);
                              const isFuture = isAfter(sDate, now);
                              const isProjected = isFuture && session.status === "Scheduled";
                              
                              const top = calculateTop(sDate);
                              const height = 90; // 96 - margin

                              return (
                                 <div
                                    key={session.id}
                                    onClick={(e) => { e.stopPropagation(); onViewSession(session); }}
                                    className={cn(
                                       "absolute left-2 right-2 rounded-xl p-3 border transition-all duration-300 hover:scale-[1.02] active:scale-95 group/session z-10 shadow-xl overflow-hidden cursor-pointer",
                                       session.status === "Active" 
                                          ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/40 text-[var(--ui-accent)] shadow-[var(--ui-accent)]/10" 
                                          : session.status === "Ended" 
                                             ? "bg-[var(--ui-sidebar-bg)]/60 border-white/5 text-slate-600 opacity-60 grayscale" 
                                             : isProjected 
                                                ? "bg-white/[0.02] border-white/10 text-slate-300 hover:border-[var(--ui-accent)]/40" 
                                                : "bg-[var(--ui-sidebar-bg)]/80 border-white/10 text-slate-200"
                                    )}
                                    style={{ top: `${top + 3}px`, height: `${height}px` }}
                                 >
                                    <div className="flex flex-col h-full relative z-10">
                                       <div className="flex items-start justify-between gap-2 mb-1">
                                          <div className="min-w-0">
                                             <p className="text-[11px] font-bold text-white uppercase tracking-tight truncate leading-none mb-1">
                                                {session.group?.name || "Ready State"}
                                             </p>
                                             <div className="flex items-center gap-1 opacity-50">
                                                <Layers className="w-2.5 h-2.5" />
                                                <span className="text-[7.5px] font-bold uppercase tracking-widest truncate">
                                                   SID-{session.sessionNumber}
                                                </span>
                                             </div>
                                          </div>
                                          {session.status === "Active" ? (
                                             <div className="relative">
                                                <div className="absolute inset-0 bg-[var(--ui-accent)]/40 blur-md rounded-full animate-pulse" />
                                                <Zap className="w-4 h-4 text-[var(--ui-accent)]" />
                                             </div>
                                          ) : (
                                             <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover/session:text-[var(--ui-accent)] transition-colors" />
                                          )}
                                       </div>

                                       <div className="mt-auto flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 text-[8.5px] font-bold tabular-nums tracking-wider text-slate-500">
                                             <Clock className="w-3 h-3 opacity-50" />
                                             {format(sDate, "h:mm a")}
                                          </div>
                                          {session.status === "Active" && (
                                             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/30 animate-pulse">
                                                <span className="w-1 h-1 rounded-full bg-[var(--ui-accent)]" />
                                                <span className="text-[6.5px] font-bold uppercase tracking-widest text-[var(--ui-accent)]">Live</span>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                    
                                    {/* Ambient Hover Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/5 to-transparent opacity-0 group-hover/session:opacity-100 transition-opacity pointer-events-none" />
                                 </div>
                              );
                           })}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
