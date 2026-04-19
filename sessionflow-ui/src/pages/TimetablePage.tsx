import React, { useState, useEffect, useRef } from "react";
import { Calendar, Plus, Filter, Download, MoreHorizontal, ChevronLeft, ChevronRight, Loader2, Clock, Check, X, Zap, Activity, Info } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button, Input, Badge, Modal, ConfirmDialog } from "../components/ui";
import { WeekView } from "../components/timetable/WeekView";
import { cn } from "../lib/utils";
import { useGroups } from "../queries/useGroupQueries";
import { useTimetableEntries, useTimetableMutations } from "../queries/useTimetableQueries";
import { useInfiniteSessions, useSessionMutations } from "../queries/useSessionQueries";
import { Session, Group, TimetableEntry, GroupScheduleEntry } from "../types";
import { useSignalR } from "../providers/SignalRProvider";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TimetablePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSessionGroupId, setNewSessionGroupId] = useState("");
  const [newSessionDate, setNewSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newSessionTime, setNewSessionTime] = useState("09:00");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Availability Modal State
  const [isAvailOpen, setIsAvailOpen] = useState(false);
  const [availability, setAvailability] = useState<TimetableEntry[]>([]);

  const { on } = useSignalR();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: timetableData, isLoading: loadingTimetable } = useTimetableEntries();
  const { data: groupsData, isLoading: loadingGroups } = useGroups({ pageSize: 100 });
  const { data: sessionsData, isLoading: loadingSessions } = useInfiniteSessions({
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
    pageSize: 200
  });

  const sessions = sessionsData?.pages.flatMap(p => p.items) || [];
  const groupSchedules = timetableData?.groupSchedules || [];
  const groups = groupsData?.items || [];
  const loading = loadingTimetable || loadingGroups || loadingSessions;

  const { createMutation: createSessionMutation } = useSessionMutations();
  const { autoFillMutation, updateAvailabilityMutation } = useTimetableMutations();
  
  const submitting = createSessionMutation.isPending || autoFillMutation.isPending;
  const savingAvail = updateAvailabilityMutation.isPending;

  useEffect(() => {
    if (timetableData?.availability) {
      setAvailability(timetableData.availability);
    }
  }, [timetableData]);

  const fetchFreeSlots = async () => {
    if (!newSessionGroupId || !newSessionDate) return;
    setLoadingSlots(true);
    try {
      const group = groups.find((g: Group) => g.id === newSessionGroupId);
      if (!group) return;
      
      const { timetableApi } = await import("../api/resources_extra");
      const slots = await timetableApi.getFreeSlots(group.engineerId, newSessionDate, 60);
      setAvailableSlots(slots);
      if (slots.length > 0 && !slots.includes(newSessionTime)) {
        setNewSessionTime(slots[0]);
      }
    } catch (err) {
      toast.error(t("common.error"));
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchFreeSlots();
  }, [newSessionGroupId, newSessionDate]);


  const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleAddSession = (date: Date, groupId?: string) => {
    setNewSessionDate(format(date, "yyyy-MM-dd"));
    setNewSessionTime(format(date, "HH:mm"));
    if (groupId) {
      setNewSessionGroupId(groupId);
    }
    setIsCreateOpen(true);
  };

  const handleViewSession = (session: Session) => {
    navigate(`/sessions/${session.id}`);
  };

  const handleCreateSession = async () => {
    if (!newSessionGroupId || !newSessionDate || !newSessionTime) return;
    try {
      const scheduledAt = new Date(`${newSessionDate}T${newSessionTime}`).toISOString();
      const session = await createSessionMutation.mutateAsync({
        groupId: newSessionGroupId,
        scheduledAt: scheduledAt
      });
      toast.success(t("timetable.modal.success_schedule"));
      setIsCreateOpen(false);
      navigate(`/sessions/${session.id}`);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      await updateAvailabilityMutation.mutateAsync(availability);
      toast.success(t("timetable.modal.success_avail"));
      setIsAvailOpen(false);
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  const toggleDay = (dayIndex: number) => {
    setAvailability(prev => {
      const existing = prev.find(a => a.dayOfWeek === dayIndex);
      if (existing) {
        return prev.map(a => a.dayOfWeek === dayIndex ? { ...a, isAvailable: !a.isAvailable } : a);
      } else {
        return [...prev, { 
          dayOfWeek: dayIndex, 
          isAvailable: true, 
          segments: [{ startTime: "09:00", endTime: "17:00" }],
          engineerId: "" 
        } as TimetableEntry];
      }
    });
  };

  const updateSegmentTime = (dayIndex: number, segmentIndex: number, field: "startTime" | "endTime", value: string) => {
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dayIndex) return a;
      
      const newSegments = [...(a.segments || [])];
      if (newSegments.length === 0 && a.startTime && a.endTime) {
         newSegments.push({ startTime: a.startTime, endTime: a.endTime });
      }
      
      if (newSegments[segmentIndex]) {
        newSegments[segmentIndex] = { ...newSegments[segmentIndex], [field]: value };
      }
      return { ...a, segments: newSegments };
    }));
  };

  const addSegment = (dayIndex: number) => {
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dayIndex) return a;
      const newSegments = [...(a.segments || [])];
      if (newSegments.length === 0 && a.startTime && a.endTime) {
         newSegments.push({ startTime: a.startTime, endTime: a.endTime });
      }
      newSegments.push({ startTime: "17:00", endTime: "20:00" });
      return { ...a, segments: newSegments };
    }));
  };
  
  const removeSegment = (dayIndex: number, segmentIndex: number) => {
    setAvailability(prev => prev.map(a => {
      if (a.dayOfWeek !== dayIndex) return a;
      const newSegments = [...(a.segments || [])];
      if (segmentIndex >= 0 && segmentIndex < newSegments.length) {
         newSegments.splice(segmentIndex, 1);
      }
      return { ...a, segments: newSegments, isAvailable: newSegments.length > 0 };
    }));
  };

  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SessionFlow//EN\n";
    
    sessions.forEach(session => {
       const groupNode = groups.find(g => g.id === session.groupId);
       const title = groupNode ? `SessionFlow: ${groupNode.name}` : "SessionFlow Event";
       const startDate = new Date(session.scheduledAt);
       const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
       const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
       icsContent += "BEGIN:VEVENT\n";
       icsContent += `DTSTART:${formatDate(startDate)}\n`;
       icsContent += `DTEND:${formatDate(endDate)}\n`;
       icsContent += `SUMMARY:${title}\n`;
       if (session.notes) icsContent += `DESCRIPTION:${session.notes}\n`;
       icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `timetable-${format(currentDate, "yyyy-MM-dd")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("timetable.controls.export_success"));
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      {/* Decorative Zenith Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--ui-accent)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7c3aed]/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0 relative z-10">
        <div className="space-y-1 text-start">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {t("timetable.title")}
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase flex items-center gap-2">
             <Zap className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
             {t("timetable.subtitle") || "Projection Matrix Alpha"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Date Navigation */}
           <div className="flex items-center bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border border-white/5 rounded-xl p-1.5 shadow-xl">
             <button onClick={handlePrevWeek} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
               <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
             </button>
             <button onClick={handleToday} className="px-5 text-xs font-bold text-slate-300 uppercase hover:text-[var(--ui-accent)] transition-colors min-w-[160px]">
               {format(currentDate, "MMMM yyyy")}
             </button>
             <button onClick={handleNextWeek} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
               <ChevronRight className="w-5 h-5 rtl:rotate-180" />
             </button>
           </div>
           
           <div className="flex gap-3">
             <button 
                onClick={async () => {
                  const loadingToast = toast.loading(t("timetable.syncing") || "Initializing synchronization protocols...");
                  try {
                    await autoFillMutation.mutateAsync();
                    toast.success(t("timetable.sync_success") || "Sync Successful", { id: loadingToast });
                  } catch (err: any) {
                    toast.error(err.message || t("timetable.sync_failure") || "Sync Failure", { id: loadingToast });
                  }
                }} 
               className="h-12 px-6 rounded-xl bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/20 text-xs font-bold uppercase text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-all flex items-center gap-2"
             >
               <Activity className="w-4 h-4" /> {t("timetable.controls.sync") || "SYNC NODES"}
             </button>

             <button onClick={() => setIsAvailOpen(true)} className="h-12 px-6 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold uppercase text-slate-400 hover:text-white transition-all flex items-center gap-2">
               <Clock className="w-4 h-4 text-[var(--ui-accent)]" /> {t("timetable.modal.avail_title")}
             </button>

             <button onClick={() => setIsCreateOpen(true)} className="btn-primary h-12 px-8 flex items-center gap-2">
               <Plus className="w-4 h-4" /> {t("timetable.modal.schedule_title")}
             </button>
           </div>
        </div>
      </div>

      {/* Main Content - Full Height WeekView */}
      <div className="flex-1 px-8 pb-8 overflow-hidden relative z-10">
        <div className="h-full rounded-xl border border-white/5 bg-[var(--ui-sidebar-bg)]/40 backdrop-blur-3xl overflow-hidden relative shadow-2xl">
           {loading ? (
             <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                   <Loader2 className="w-8 h-8 text-[var(--ui-accent)] animate-spin" />
                   <span className="text-xs font-bold uppercase text-slate-500">{t("timetable.loading")}</span>
                </div>
             </div>
           ) : (
             <WeekView 
               sessions={sessions}
               groupSchedules={groupSchedules}
               currentDate={currentDate}
               onAddSession={handleAddSession}
               onViewSession={handleViewSession}
             />
           )}
        </div>
      </div>

      {/* Bottom Toolbar / Legend */}
      <div className="px-10 py-5 border-t border-white/5 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-10">
             <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] shadow-[0_0_10px_rgba(var(--ui-accent-rgb),0.5)]" />
                <span className="text-xs font-bold text-slate-500 uppercase">{t("timetable.legend.projected") || "PROJECTED"}</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                <span className="text-xs font-bold text-slate-500 uppercase">{t("timetable.legend.live_deploy") || "OPERATIONAL"}</span>
             </div>
             <div className="flex items-center gap-3 opacity-40">
                <div className="w-2.5 h-2.5 rounded-full bg-var(--ui-surface)" />
                <span className="text-xs font-bold text-slate-600 uppercase">{t("timetable.legend.archive") || "ARCHIVE"}</span>
             </div>
          </div>
          <button onClick={handleExportICS} className="h-10 px-6 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold uppercase text-slate-500 hover:text-white transition-all flex items-center gap-3">
            <Download className="w-4 h-4 opacity-50" /> {t("timetable.controls.export") || "EXPORT GRID"}
          </button>
      </div>

      {/* Create Session Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t("timetable.modal.schedule_title")}>
        <div className="space-y-8 p-2 text-start">
          <div className="p-5 bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10 rounded-xl flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-glow"><Info className="w-5 h-5" /></div>
             <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed">{t("timetable.modal.select_group_desc") || "Select the target unit for deployment."}</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase ps-1">{t("timetable.modal.select_group")}</label>
              <select 
                className="w-full h-14 rounded-xl border border-white/5 bg-black/40 px-5 text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
                value={newSessionGroupId}
                onChange={(e) => setNewSessionGroupId(e.target.value)}
              >
                <option value="" className="bg-[var(--ui-sidebar-bg)]">{t("timetable.modal.select_placeholder")}</option>
                {groups.map((g: Group) => (
                  <option key={g.id} value={g.id} className="bg-[var(--ui-sidebar-bg)]">{g.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase ps-1">{t("timetable.modal.launch_date")}</label>
                <input 
                  type="date" 
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full h-14 rounded-xl border border-white/5 bg-black/40 px-5 text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase ps-1">{t("timetable.modal.launch_time")}</label>
                <select 
                  value={newSessionTime}
                  onChange={(e) => setNewSessionTime(e.target.value)}
                  className="w-full h-14 rounded-xl border border-white/5 bg-black/40 px-5 text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
                >
                  {availableSlots.length > 0 ? (
                    availableSlots.map(t => <option key={t} value={t} className="bg-[var(--ui-sidebar-bg)]">{t}</option>)
                  ) : (
                    <option disabled className="bg-[var(--ui-sidebar-bg)]">{t("timetable.modal.no_slots")}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
              <button className="flex-1 h-12 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold uppercase text-slate-400 hover:text-white transition-all" onClick={() => setIsCreateOpen(false)}>{t("common.cancel")}</button>
              <button disabled={submitting || !newSessionGroupId} className="btn-primary flex-1 h-12" onClick={handleCreateSession}>
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("timetable.modal.confirm")}
              </button>
          </div>
        </div>
      </Modal>

      {/* Availability Modal */}
      <Modal isOpen={isAvailOpen} onClose={() => setIsAvailOpen(false)} title={t("timetable.modal.avail_title")} className="max-w-3xl">
        <div className="space-y-8 p-2 text-start">
          <div className="flex items-center gap-6 p-6 bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10 rounded-xl">
             <div className="w-12 h-12 rounded-xl bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-glow">
                <Clock className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[12px] font-bold text-white uppercase mb-1">{t("timetable.modal.duty_window")}</p>
                <p className="text-xs text-slate-500 font-medium uppercase leading-tight">{t("timetable.modal.duty_desc")}</p>
             </div>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto px-1 custom-scrollbar pe-3">
            {DAYS.map((day: string, i: number) => {
              const entry = availability.find(a => a.dayOfWeek === i);
              const isActive = entry?.isAvailable ?? false;
              let segments = entry?.segments || [];
              
              if (segments.length === 0 && entry?.startTime && entry?.endTime) {
                 segments = [{ startTime: entry.startTime, endTime: entry.endTime }];
              }
              
              return (
                <div key={day} className={cn("p-6 rounded-xl border transition-all duration-300", 
                  isActive ? "bg-white/[0.02] border-white/10 shadow-lg" : "bg-black/20 border-white/5 opacity-40")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => toggleDay(i)}
                        className={cn("w-12 h-6 rounded-full relative transition-all duration-500", isActive ? "bg-[var(--ui-accent)] shadow-glow" : "bg-[var(--ui-bg)]")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-xl", isActive ? "translate-x-7" : "translate-x-1")} />
                      </button>
                      <span className="text-sm font-bold text-white uppercase w-24">{day}</span>
                    </div>
                    {isActive && (
                      <button onClick={() => addSegment(i)} className="h-9 px-4 text-xs font-bold uppercase text-[var(--ui-accent)] bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/20 hover:bg-[var(--ui-accent)]/10 rounded-lg flex items-center gap-2 transition-all">
                         <Plus className="w-3.5 h-3.5" /> {t("timetable.modal.add_slot") || "ADD SLOT"}
                      </button>
                    )}
                  </div>
                  
                  {isActive && (
                    <div className="space-y-4 animate-fade-in">
                      {segments.map((seg, sIdx) => (
                        <div key={sIdx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 ps-0 sm:ps-16">
                           <select 
                             value={seg.startTime}
                             onChange={(e) => updateSegmentTime(i, sIdx, "startTime", e.target.value)}
                             className="bg-black/40 border border-white/5 rounded-lg h-11 px-4 text-[11px] font-bold text-slate-300 w-36 focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]/30"
                           >
                             {TIME_SLOTS.map(t => <option key={t} value={t} className="bg-[var(--ui-sidebar-bg)]">{t}</option>)}
                           </select>
                           <div className="w-4 h-px bg-white/10" />
                           <select 
                             value={seg.endTime}
                             onChange={(e) => updateSegmentTime(i, sIdx, "endTime", e.target.value)}
                             className="bg-black/40 border border-white/5 rounded-lg h-11 px-4 text-[11px] font-bold text-slate-300 w-36 focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]/30"
                           >
                             {TIME_SLOTS.map(t => <option key={t} value={t} className="bg-[var(--ui-sidebar-bg)]">{t}</option>)}
                           </select>
                           {segments.length > 1 && (
                             <button onClick={() => removeSegment(i, sIdx)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                               <X className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 pt-4">
              <button className="flex-1 h-12 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold uppercase text-slate-400 hover:text-white transition-all" onClick={() => setIsAvailOpen(false)}>{t("common.cancel")}</button>
              <button disabled={savingAvail} className="btn-primary flex-1 h-12" onClick={handleUpdateAvailability}>
                 {savingAvail ? <Loader2 className="w-5 h-5 animate-spin" /> : t("timetable.modal.save")}
              </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetablePage;

