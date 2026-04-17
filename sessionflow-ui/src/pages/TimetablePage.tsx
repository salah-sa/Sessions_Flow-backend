import React, { useState, useEffect, useRef } from "react";
import { Calendar, Plus, Filter, Download, MoreHorizontal, ChevronLeft, ChevronRight, Loader2, Clock, Check, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { useHoverSound } from "../hooks/useHoverSound";
import { useNavigate } from "react-router-dom";
import { Card, Button, Input, Badge, Modal } from "../components/ui";
import { WeekView } from "../components/timetable/WeekView";
import { cn } from "../lib/utils";
import { useGroups } from "../queries/useGroupQueries";
import { useTimetableEntries, useTimetableMutations } from "../queries/useTimetableQueries";
import { useInfiniteSessions, useSessionMutations } from "../queries/useSessionQueries";
import { Session, Group, TimetableEntry } from "../types";
import { useSignalR } from "../providers/SignalRProvider";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import gsap from "gsap";

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

const TimetablePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const playHover = useHoverSound();

  // Animation Refs
  const headerRef = useRef(null);
  const controlsRef = useRef(null);
  const gridRef = useRef(null);

  const DAYS = [
    t("common.days.sunday"),
    t("common.days.monday"),
    t("common.days.tuesday"),
    t("common.days.wednesday"),
    t("common.days.thursday"),
    t("common.days.friday"),
    t("common.days.saturday")
  ];

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

  // Real-time updates handled globally via SignalRProvider

  // GSAP Animations
  useEffect(() => {
    if (!loading) {
      const ctx = gsap.context(() => {
        gsap.from(headerRef.current, {
           y: -20,
           opacity: 0,
           duration: 0.8,
           ease: "expo.out"
        });
        
        gsap.from(controlsRef.current, {
           y: 10,
           opacity: 0,
           duration: 0.8,
           delay: 0.2,
           ease: "power2.out"
        });

        gsap.from(gridRef.current, {
           scale: 0.98,
           opacity: 0,
           duration: 1,
           delay: 0.4,
           ease: "expo.out"
        });
      });
      return () => ctx.revert();
    }
  }, [loading]);

  const fetchFreeSlots = async () => {
    if (!newSessionGroupId || !newSessionDate) return;
    setLoadingSlots(true);
    try {
      const group = groups.find(g => g.id === newSessionGroupId);
      if (!group) return;
      
      // We still need this one-off API call for free slots
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

  const handleAddSession = (date: Date) => {
    setNewSessionDate(format(date, "yyyy-MM-dd"));
    setNewSessionTime(format(date, "HH:mm"));
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
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in overflow-hidden relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div ref={headerRef} className="px-8 py-8 border-b border-white/5 bg-slate-950/20 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-500 rounded-2xl shadow-xl shadow-blue-500/20">
                <Calendar className="w-8 h-8 text-white" />
             </div>
             <div className="space-y-1">
                <h1 className="text-4xl font-sora font-black text-white tracking-tighter uppercase leading-none">
                  {t("timetable.title")}
                </h1>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] ps-1 flex items-center gap-3">
                   <Zap className="w-3 h-3 text-blue-400" />
                   {t("timetable.subtitle") || "Synchronized Projected Deployment Grid"}
                </p>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6 md:mt-0">
           <div ref={controlsRef} className="flex bg-slate-900 border border-white/5 rounded-2xl p-1.5 shadow-2xl overflow-x-auto hide-scrollbar max-w-full">
             <button onClick={handlePrevWeek} onMouseEnter={playHover} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
               <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
             </button>
             <button onClick={handleToday} onMouseEnter={playHover} className="px-5 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-blue-400 transition-colors">
               {format(currentDate, "MMMM yyyy")}
             </button>
             <button onClick={handleNextWeek} onMouseEnter={playHover} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
               <ChevronRight className="w-5 h-5 rtl:rotate-180" />
             </button>
           </div>
           
           <div className="h-10 w-px bg-white/10 mx-2" />
           
           <button 
              onClick={async () => {
                const loadingToast = toast.loading(t("timetable.syncing") || "Deploying synchronization protocols...");
                try {
                  await autoFillMutation.mutateAsync();
                  toast.success(t("timetable.sync_success") || "Deployment successful: Timetable Matrix Up-to-date", { id: loadingToast });
                } catch (err: any) {
                  toast.error(err.message || t("timetable.sync_failure") || "Protocol Failure", { id: loadingToast });
                }
              }} 
             className="flex items-center justify-center h-12 text-[10px] font-black uppercase px-6 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl hover:bg-emerald-500/10 transition-all shadow-glow shadow-emerald-500/5 whitespace-nowrap"
           >
             <Check className="w-4 h-4 me-3 shrink-0" /> {t("timetable.controls.sync") || "SYNC FROM NODES"}
           </button>

           <button onClick={() => setIsAvailOpen(true)} className="flex items-center justify-center h-12 px-6 border border-white/5 rounded-2xl bg-slate-900 text-slate-300 uppercase text-[10px] font-black tracking-[0.2em] whitespace-nowrap hover:bg-slate-800 transition-all">
             <Clock className="w-4 h-4 me-3 shrink-0 text-blue-400" /> {t("timetable.modal.avail_title")}
           </button>

           <button onClick={() => setIsCreateOpen(true)} className="flex items-center justify-center h-12 bg-white text-black hover:bg-slate-100 shadow-2xl font-black uppercase tracking-[0.2em] text-[10px] px-8 rounded-2xl transition-all whitespace-nowrap active:scale-95">
             <Plus className="w-4 h-4 me-3 shrink-0" /> {t("timetable.modal.schedule_title")}
           </button>
        </div>
      </div>

      {/* Main Content - Full Height WeekView */}
      <div ref={gridRef} className="flex-1 px-8 py-6 overflow-hidden relative z-10">
        {loading ? (
          <div className="h-full grid grid-cols-7 gap-6">
             {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="bg-white/[0.01] border border-white/5 animate-pulse rounded-3xl h-full shadow-inner" />
             ))}
          </div>
        ) : (
          <div className="h-full rounded-[2.5rem] border border-white/5 bg-slate-900/10 backdrop-blur-md overflow-hidden relative shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
             <WeekView 
               sessions={sessions}
               currentDate={currentDate}
               onAddSession={handleAddSession}
               onViewSession={handleViewSession}
             />
          </div>
        )}
      </div>

      {/* Footer / Legend */}
      <div className="px-10 py-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-3xl flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-10">
             <div className="flex items-center gap-4 group cursor-default">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-glow" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-white transition-colors">{t("timetable.legend.projected") || "PROJECTED"}</span>
             </div>
             <div className="flex items-center gap-4 group cursor-default">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-emerald" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-white transition-colors">{t("timetable.legend.live_deploy") || "LIVE-DEPLOY"}</span>
             </div>
             <div className="flex items-center gap-4 group cursor-default opacity-40">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-white transition-colors">{t("timetable.legend.archive") || "ARCHIVE"}</span>
             </div>
          </div>
          <button onClick={handleExportICS} className="h-10 px-8 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 bg-slate-900 text-slate-400 hover:text-white transition-all shadow-xl flex items-center gap-4">
            <Download className="w-4 h-4 opacity-50" /> {t("timetable.controls.export") || "EXPORT SYNC DATA"}
          </button>
      </div>

      {/* Create Session Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t("timetable.modal.schedule_title")}>
        <div className="space-y-10 p-2">
          <div className="space-y-4">
            <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t("timetable.modal.select_group")}</label>
            <div className="relative">
              <select 
                className="w-full h-14 rounded-2xl border border-slate-800 bg-slate-950 px-5 text-sm font-black uppercase text-white appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/20 transition-all"
                value={newSessionGroupId}
                onChange={(e) => setNewSessionGroupId(e.target.value)}
              >
                <option value="" className="bg-slate-950">{t("timetable.modal.select_placeholder")}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-slate-950">{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const selectedGroup = groups.find(g => g.id === newSessionGroupId);
            if (!selectedGroup) return null;
            return (
              <div className="p-8 rounded-3xl border border-blue-500/20 bg-blue-500/[0.03] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-500 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all",
                    selectedGroup.colorTag === "blue" ? "bg-blue-500 shadow-blue-500/30" : 
                    selectedGroup.colorTag === "violet" ? "bg-violet-500 shadow-violet-500/30" :
                    selectedGroup.colorTag === "emerald" ? "bg-emerald-500 shadow-emerald-500/30" : 
                    selectedGroup.colorTag === "amber" ? "bg-amber-500 shadow-amber-500/30" :
                    "bg-rose-500 shadow-rose-500/30"
                  )}>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-lg text-white uppercase tracking-tighter leading-none">{selectedGroup.name}</p>
                    <div className="flex items-center gap-4">
                        <span className="text-blue-400 text-[11px] font-black uppercase tracking-widest">{t("dashboard.modal.level")} {selectedGroup.level}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{selectedGroup.studentCount ?? 0} {t("dashboard.modal.students")}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("dashboard.modal.progression")}</p>
                   <p className="text-3xl font-sora font-black text-white leading-none">
                      {selectedGroup.currentSessionNumber}
                      <span className="text-sm text-slate-600 font-bold"> / {selectedGroup.totalSessions}</span>
                   </p>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t("timetable.modal.launch_date")}</label>
              <Input 
                type="date" 
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white font-black uppercase text-xs tracking-widest focus:ring-4 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t("timetable.modal.launch_time")}</label>
              <select 
                value={newSessionTime}
                onChange={(e) => setNewSessionTime(e.target.value)}
                className="w-full h-14 rounded-2xl border border-slate-800 bg-slate-950 px-5 text-sm font-black uppercase text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map(t => <option key={t} value={t}>{t}</option>)
                ) : (
                  <option disabled>{t("timetable.modal.no_slots")}</option>
                )}
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-10 border-t border-slate-800">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px]" onClick={() => setIsCreateOpen(false)}>{t("timetable.modal.abort")}</Button>
              <Button disabled={submitting || !newSessionGroupId} className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-[0.2em] text-[11px] shadow-glow" onClick={handleCreateSession}>
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("timetable.modal.confirm")}
              </Button>
          </div>
        </div>
      </Modal>

      {/* Availability Modal Upgrade */}
      <Modal isOpen={isAvailOpen} onClose={() => setIsAvailOpen(false)} title={t("timetable.modal.avail_title")} className="max-w-3xl bg-slate-950/95 backdrop-blur-3xl">
        <div className="space-y-10">
          <div className="flex items-center gap-6 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem]">
             <div className="w-14 h-14 rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/20 flex items-center justify-center text-white">
                <Clock className="w-7 h-7" />
             </div>
             <div>
                <p className="text-[14px] font-black text-white uppercase tracking-widest leading-none mb-2">{t("timetable.modal.duty_window")}</p>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-tight">{t("timetable.modal.duty_desc")}</p>
             </div>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto px-2 custom-scrollbar pe-4">
            {DAYS.map((day, i) => {
              const entry = availability.find(a => a.dayOfWeek === i);
              const isActive = entry?.isAvailable ?? false;
              let segments = entry?.segments || [];
              
              if (segments.length === 0 && entry?.startTime && entry?.endTime) {
                 segments = [{ startTime: entry.startTime, endTime: entry.endTime }];
              }
              
              return (
                <div key={day} className={cn("p-6 rounded-[2rem] border transition-all duration-500", 
                  isActive ? "bg-slate-900 border-white/10 shadow-2xl" : "bg-slate-950/20 border-white/5 opacity-50")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => toggleDay(i)}
                        className={cn("w-14 h-8 rounded-full relative transition-all duration-500", isActive ? "bg-emerald-500 shadow-glow-emerald" : "bg-slate-800")}
                      >
                        <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xl", isActive ? "translate-x-7" : "translate-x-1")} />
                      </button>
                      <span className="text-lg font-sora font-black text-white uppercase tracking-tighter w-32">{day}</span>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => addSegment(i)} className="h-10 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 rounded-xl">
                           <Plus className="w-4 h-4 me-2" /> {t("timetable.modal.add_slot") || "ADD SLOT"}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {isActive && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                      {segments.map((seg, sIdx) => (
                        <div key={sIdx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 ps-0 sm:ps-20">
                           <select 
                            value={seg.startTime}
                            onChange={(e) => updateSegmentTime(i, sIdx, "startTime", e.target.value)}
                            className="bg-slate-950 border border-white/5 rounded-2xl h-12 px-5 text-sm font-black text-white w-40 appearance-none shadow-xl cursor-pointer hover:border-blue-500/30 transition-all"
                           >
                             {TIME_SLOTS.map(t => {
                               const [h, m] = t.split(":");
                               const hour = parseInt(h, 10);
                               const ampm = hour >= 12 ? "PM" : "AM";
                               const hour12 = hour % 12 || 12;
                               return <option key={t} value={t}>{`${hour12}:${m} ${ampm}`}</option>;
                             })}
                           </select>
                           <div className="w-6 h-1 bg-slate-800 rounded-full" />
                           <select 
                            value={seg.endTime}
                            onChange={(e) => updateSegmentTime(i, sIdx, "endTime", e.target.value)}
                            className="bg-slate-950 border border-white/5 rounded-2xl h-12 px-5 text-sm font-black text-white w-40 appearance-none shadow-xl cursor-pointer hover:border-blue-500/30 transition-all"
                           >
                             {TIME_SLOTS.map(t => {
                               const [h, m] = t.split(":");
                               const hour = parseInt(h, 10);
                               const ampm = hour >= 12 ? "PM" : "AM";
                               const hour12 = hour % 12 || 12;
                               return <option key={t} value={t}>{`${hour12}:${m} ${ampm}`}</option>;
                             })}
                           </select>
                           {segments.length > 1 && (
                             <button onClick={() => removeSegment(i, sIdx)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors">
                               <X className="w-6 h-6" />
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

          <div className="flex gap-4 pt-10 border-t border-slate-800">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px]" onClick={() => setIsAvailOpen(false)}>{t("timetable.modal.cancel")}</Button>
              <Button disabled={savingAvail} className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-[0.2em] text-[11px] shadow-glow" onClick={handleUpdateAvailability}>
                 {savingAvail ? <Loader2 className="w-6 h-6 animate-spin" /> : t("timetable.modal.save")}
              </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetablePage;
