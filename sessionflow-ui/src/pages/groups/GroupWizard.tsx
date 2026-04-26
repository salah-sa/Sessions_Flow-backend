import React, { useState, useEffect } from "react";
import { Modal, Button, Input } from "../../components/ui";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { 
  Info, Settings, Users, CheckCircle2, Plus, Minus, X, Trash2, 
  Calendar, ShieldCheck, PlayCircle, ChevronRight, Loader2, AlertTriangle, GraduationCap, Pencil, Check
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { useCheckGroupName } from "../../queries/useGroupQueries";
import { useGroupStudents, useStudentMutations } from "../../queries/useStudentQueries";
import { 
  groupSchema, GroupFormValues, TIME_SLOTS, 
  LEVEL_SESSION_MAP, LEVEL_CAPACITY_MAP 
} from "./GroupConstants";
import { Group } from "../../types";

interface GroupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  selectedGroup: Group | null;
  onSubmit: (data: GroupFormValues) => Promise<void>;
  submitting: boolean;
}

export const GroupWizard: React.FC<GroupWizardProps> = ({
  isOpen,
  onClose,
  mode,
  selectedGroup,
  onSubmit,
  submitting
}) => {
  const { t } = useTranslation();
  const [wizardStep, setWizardStep] = useState(1);
  const checkName = useCheckGroupName();

  // Edit-mode live student management
  const { data: existingStudents, refetch: refetchStudents } = useGroupStudents(mode === "edit" ? selectedGroup?.id : undefined);
  const { createMutation: addStudentMut, updateMutation: updateStudentMut, deleteMutation: deleteStudentMut } = useStudentMutations();
  const [newStudentName, setNewStudentName] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState("");
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  const { register, handleSubmit, reset, control, setValue, watch, getValues, setError, formState: { errors, isSubmitting } } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { 
      level: 1, 
      colorTag: "blue", 
      numberOfStudents: 4, 
      frequency: 1,
      totalSessions: 13,
      startingSessionNumber: 1, 
      schedules: [{ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 }], 
        cadets: Array.from({ length: 4 }, () => ({ name: "", studentId: "" })) 
      }
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedules"
  });

  const currentColorTag = watch("colorTag");
  const currentLevel = watch("level");
  const watchedStudentCount = watch("numberOfStudents");

  // Sync logic from GroupsPage
  useEffect(() => {
    if (isOpen && mode === "edit" && selectedGroup) {
      reset({
        name: selectedGroup.name,
        description: selectedGroup.description,
        level: selectedGroup.level,
        colorTag: selectedGroup.colorTag,
        numberOfStudents: selectedGroup.numberOfStudents,
        frequency: selectedGroup.frequency || 1,
        totalSessions: selectedGroup.totalSessions,
        startingSessionNumber: selectedGroup.startingSessionNumber,
        schedules: selectedGroup.schedules?.map(s => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          durationMinutes: s.durationMinutes
        })) || []
      });
      setWizardStep(1);
    } else if (isOpen && mode === "create") {
      setWizardStep(1);
      const capacity = LEVEL_CAPACITY_MAP[1];
      reset({ 
        name: "", 
        description: "", 
        level: 1, 
        colorTag: "blue", 
        numberOfStudents: capacity, 
        frequency: 1,
        totalSessions: 13,
        startingSessionNumber: 1, 
        schedules: [{ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 }], 
        cadets: Array.from({ length: capacity }, () => ({ name: "", studentId: "" })) 
      });
    }
  }, [isOpen, mode, selectedGroup, reset]);

  useEffect(() => {
    const sessions = LEVEL_SESSION_MAP[currentLevel] ?? 13;
    const capacity = LEVEL_CAPACITY_MAP[currentLevel] ?? 4;
    const currentSessions = getValues("totalSessions");
    const currentStudents = getValues("numberOfStudents");
    const currentStartOffset = getValues("startingSessionNumber");

    if (currentSessions !== sessions) setValue("totalSessions", sessions);
    if (currentStudents > capacity) setValue("numberOfStudents", capacity);
    if (currentStartOffset > sessions) setValue("startingSessionNumber", sessions);

    if (mode === "create" && wizardStep === 1) {
      if (getValues("numberOfStudents") !== capacity) {
        setValue("numberOfStudents", capacity);
      }
    }
  }, [currentLevel, mode, wizardStep, setValue, getValues]);

  useEffect(() => {
    if (mode === "edit") return;
    const count = watchedStudentCount || 4;
    if (count > 0 && count <= 10) {
      const currentCadets = getValues("cadets") || [];
      if (currentCadets.length !== count) {
        const newCadets = Array.from({ length: count }, (_, i) => ({
          name: currentCadets[i]?.name || "",
          studentId: currentCadets[i]?.studentId || ""
        }));
        setValue("cadets", newCadets, { shouldDirty: true });
      }
    }
  }, [watchedStudentCount, setValue, getValues, mode]);

  const handleNext = async () => {
    if (wizardStep === 1) {
      const name = watch("name");
      if (!name || name.trim().length < 3) {
        toast.error(t("groups.modal.name_min_length"));
        return;
      }

      // Check if name is taken (skip in edit mode if name unchanged)
      const nameChanged = mode === "edit" ? name.trim() !== selectedGroup?.name?.trim() : true;
      if (nameChanged) {
        try {
          const excludeId = mode === "edit" && selectedGroup?.id ? selectedGroup.id : undefined;
          const { available } = await checkName.mutateAsync({ name, excludeId });
          if (!available) {
            setError("name", { 
              type: "manual", 
              message: t("groups.modal.name_exists") 
            });
            return;
          }
        } catch (error) {
          console.error("Name check failed:", error);
          toast.error(t("common.error"));
          return;
        }
      }
    }
    if (wizardStep === 2) {
      if (fields.length === 0) {
        toast.error("Strict Rule: At least 1 session per week schedule must be defined.");
        return;
      }
    }
    if (wizardStep === 3) {
      const cadets = watch("cadets") || [];
      for(const c of cadets) {
        if (!c.name || c.name.trim().length < 2) {
          toast.error("Strict Rule: All cadet names must be provided to generate system UUIDs.");
          return;
        }
      }
    }
    setWizardStep(w => w + 1);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={mode === "create" ? t("groups.modal.create") : t("groups.modal.edit")}
      className="max-w-2xl"
    >
      <div className="flex gap-2 p-1 bg-[var(--ui-sidebar-bg)] border border-white/5 rounded-2xl mb-10">
        {[
          { id: 1, label: t("groups.wizard.steps.identity"), icon: Info },
          { id: 2, label: t("groups.wizard.steps.params"), icon: Settings },
          { id: 3, label: t("groups.wizard.steps.roster"), icon: Users },
          { id: 4, label: t("groups.wizard.steps.confirm"), icon: CheckCircle2 }
        ].map(step => (
          <div 
            key={step.id} 
            className={cn(
              "flex-1 h-10 px-2 md:px-4 rounded-xl flex items-center justify-center gap-2 transition-all",
              wizardStep === step.id ? "bg-[var(--ui-accent)] text-white shadow-glow" : "text-slate-600"
            )}
          >
            <step.icon className={cn("w-3.5 h-3.5", wizardStep === step.id ? "animate-pulse" : "")} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden sm:inline">{step.label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(async (data) => await onSubmit(data))} className="space-y-6">
        {wizardStep === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.name")}</label>
                <input 
                  {...register("name")} 
                  placeholder={t("groups.modal.placeholder_name")} 
                  className="w-full h-12 rounded-xl border border-[var(--ui-sidebar-bg)] bg-black/40 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/50 shadow-inner"
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ms-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.level")}</label>
                <select 
                  {...register("level", { valueAsNumber: true })}
                  className="w-full h-12 rounded-xl border border-[var(--ui-sidebar-bg)] bg-black/40 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/50 shadow-inner appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[position:right_1rem_center] bg-no-repeat"
                >
                  <option value={1}>{t("sidebar.levels.fundamentals")}</option>
                  <option value={2}>{t("sidebar.levels.intermediate")}</option>
                  <option value={3}>{t("sidebar.levels.advanced")}</option>
                  <option value={4}>{t("sidebar.levels.masterclass")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.identity")}</label>
              <div className="flex gap-4 p-4 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
                {["blue", "violet", "emerald", "amber", "rose"].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue("colorTag", color)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all duration-300 relative group/color",
                      color === "blue" ? "bg-blue-500" :
                      color === "violet" ? "bg-violet-500" :
                      color === "emerald" ? "bg-emerald-500" :
                      color === "amber" ? "bg-amber-500" : "bg-rose-500",
                      currentColorTag === color ? "border-white scale-110 shadow-glow" : "border-transparent opacity-40 hover:opacity-100 hover:scale-105"
                    )}
                  >
                     {currentColorTag === color && <div className="absolute inset-0 flex items-center justify-center text-white"><Plus className="w-5 h-5" /></div>}
                  </button>
                ))}
                <div className="ms-auto flex items-center pe-2">
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step1.color_hint")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.description")}</label>
              <textarea 
                {...register("description")}
                placeholder={t("groups.modal.placeholder_desc")}
                className="w-full h-32 rounded-xl border border-white/5 bg-[var(--ui-bg)] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/50 shadow-inner resize-none"
              />
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-[var(--ui-bg)] border border-red-500/10 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/[0.03] animate-pulse" />
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-red-500/80 uppercase tracking-widest">{t("groups.wizard.step2.locked")}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t("groups.wizard.step2.locked_desc")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-3 bg-[var(--ui-bg)]/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t("groups.wizard.step2.capacity")}</label>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setValue("numberOfStudents", Math.max(1, watch("numberOfStudents") - 1))} className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-black text-white tabular-nums">{watch("numberOfStudents")}</span>
                  <button type="button" onClick={() => {
                    const max = LEVEL_CAPACITY_MAP[currentLevel] || 4;
                    if (watch("numberOfStudents") < max) setValue("numberOfStudents", watch("numberOfStudents") + 1);
                    else toast.error(`Max students for Level ${currentLevel} is ${max}`);
                  }} className="w-10 h-10 rounded-xl bg-[var(--ui-bg)] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">SLOTS REMAINING</p>
              </div>

              <div className="space-y-3 bg-[var(--ui-bg)] p-5 rounded-2xl border border-white/5 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">Weekly Frequency</label>
                <div className="flex items-center justify-between gap-1">
                  {[1, 2, 3].map(freq => (
                    <button key={freq} type="button" onClick={() => {
                      setValue("frequency", freq);
                      const currentSchedules = watch("schedules");
                      if (currentSchedules.length < freq) {
                        for (let i = currentSchedules.length; i < freq; i++) append({ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 });
                      } else if (currentSchedules.length > freq) {
                        for (let i = currentSchedules.length - 1; i >= freq; i--) remove(i);
                      }
                    }} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black tracking-widest transition-all", watch("frequency") === freq ? "bg-[var(--ui-accent)] text-white shadow-glow" : "bg-[var(--ui-sidebar-bg)] text-slate-500 hover:text-slate-300")}>
                      {freq}X
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">SESSIONS/WEEK</p>
              </div>

              <div className="space-y-3 bg-[var(--ui-bg)] p-5 rounded-2xl border border-white/5 shadow-inner group/locked">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ms-1">{t("groups.wizard.step2.total_sessions")}</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] flex items-center justify-center text-slate-700">
                     <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-black text-slate-700 tabular-nums">{watch("totalSessions")}</span>
                </div>
                <p className="text-[8px] text-slate-700 font-bold uppercase tracking-tight">STRICT LEVEL CAP</p>
              </div>

              <div className="space-y-3 bg-[var(--ui-bg)] p-5 rounded-2xl border border-white/5 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t("groups.wizard.step2.starting_no")}</label>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setValue("startingSessionNumber", Math.max(1, watch("startingSessionNumber") - 1))} className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-black text-white tabular-nums">{watch("startingSessionNumber")}</span>
                  <button type="button" onClick={() => {
                    const max = LEVEL_SESSION_MAP[currentLevel] || 13;
                    if (watch("startingSessionNumber") < max) setValue("startingSessionNumber", watch("startingSessionNumber") + 1);
                    else toast.error(`Session Number cannot exceed total sessions (${max})`);
                  }} className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">STARTING OFFSET</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ps-1">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("groups.wizard.step3.recurring")}</label>
                  <p className="text-[9px] text-slate-600 font-black uppercase">{t("groups.wizard.step3.recurring_desc")}</p>
                </div>
                <button type="button" onClick={() => fields.length < 3 && append({ dayOfWeek: 1, startTime: "09:00", durationMinutes: 60 })} disabled={fields.length >= 3} className={cn("h-8 px-4 rounded-lg font-black uppercase tracking-widest text-[9px] shadow-lg transition-colors", fields.length >= 3 ? "bg-white/5 text-slate-500 opacity-50 cursor-not-allowed" : "bg-white/5 text-white hover:bg-[var(--ui-accent)]")}>
                  <Plus className="w-3.5 h-3.5 me-2" /> {t("groups.wizard.step3.add_day")}
                </button>
              </div>
              
              <div className="grid gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-[var(--ui-sidebar-bg)]/80 p-4 rounded-2xl border border-white/5 hover:border-[var(--ui-accent)]/30 transition-colors group/row">
                    <div className="w-full sm:flex-1">
                      <select 
                        {...register(`schedules.${index}.dayOfWeek` as const, { valueAsNumber: true })}
                        className="w-full h-10 rounded-xl border border-white/5 bg-[var(--ui-bg)] px-4 text-xs font-black text-slate-300 uppercase tracking-widest focus:ring-2 focus:ring-[var(--ui-accent)]/50 outline-none"
                      >
                        {[0,1,2,3,4,5,6].map(i => (
                          <option key={i} value={i}>{t(`common.days.${["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][i]}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-32">
                      <select {...register(`schedules.${index}.startTime` as const)} className="w-full h-10 rounded-xl border border-white/5 bg-[var(--ui-bg)] px-4 text-xs font-black text-slate-300 focus:ring-2 focus:ring-[var(--ui-accent)]/50 outline-none tabular-nums">
                        {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="w-full sm:w-32">
                      <select {...register(`schedules.${index}.durationMinutes` as const, { valueAsNumber: true })} className="w-full h-10 rounded-xl border border-white/5 bg-[var(--ui-bg)] px-4 text-xs font-black text-slate-300 focus:ring-2 focus:ring-[var(--ui-accent)]/50 outline-none">
                        <option value={60}>1 HOUR</option>
                        <option value={90}>1.5 HOURS</option>
                        <option value={120}>2 HOURS</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => remove(index)} className="h-10 w-full sm:w-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {fields.length === 0 && (
                  <div className="p-10 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center grayscale opacity-30 gap-4">
                      <Calendar className="w-8 h-8 text-slate-600" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("groups.wizard.step2.no_schedules")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {wizardStep === 3 && mode === "create" && (
          <div className="space-y-6 animate-fade-in max-h-[400px] overflow-y-auto custom-scrollbar pe-2">
              <div className="p-4 bg-[var(--ui-sidebar-bg)] border border-white/5 rounded-2xl flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/5">
                    <GraduationCap className="w-6 h-6 text-[var(--ui-accent)]" />
                 </div>
                 <div className="space-y-0.5">
                    <p className="text-sm font-black text-white uppercase tracking-tighter">{t("groups.wizard.step3.title")}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t("groups.wizard.step3.subtitle")}</p>
                 </div>
              </div>
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: watchedStudentCount || 4 }).map((_, index) => (
                <div key={index} className="flex gap-4 p-4 bg-[var(--ui-bg)]/50 border border-white/5 rounded-2xl group/student transition-all hover:bg-[var(--ui-sidebar-bg)]/50">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="space-y-1">
                      <label className="ps-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step3.cadet")}</label>
                      <Input placeholder={t("groups.wizard.step3.name")} {...register(`cadets.${index}.name`)} className="h-11 bg-[var(--ui-bg)] border-white/5 text-[11px] font-black tracking-tight" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wizardStep === 3 && mode === "edit" && (
          <div className="space-y-6 animate-fade-in max-h-[400px] overflow-y-auto custom-scrollbar pe-2">
            <div className="p-4 bg-[var(--ui-sidebar-bg)] border border-white/5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/5">
                <GraduationCap className="w-6 h-6 text-[var(--ui-accent)]" />
              </div>
              <div className="space-y-0.5 flex-1">
                <p className="text-sm font-black text-white uppercase tracking-tighter">{t("groups.wizard.step3.title")}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {existingStudents?.length ?? 0} / {watch("numberOfStudents")} ENROLLED
                </p>
              </div>
            </div>

            {/* Existing Students List */}
            <div className="grid grid-cols-1 gap-3">
              {existingStudents?.map((student, index) => (
                <div key={student.id} className="flex gap-3 p-4 bg-[var(--ui-bg)]/50 border border-white/5 rounded-2xl group/student transition-all hover:bg-[var(--ui-sidebar-bg)]/50">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-sidebar-bg)] border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingStudentId === student.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editingStudentName}
                          onChange={e => setEditingStudentName(e.target.value)}
                          autoFocus
                          className="flex-1 h-10 rounded-xl border border-[var(--ui-accent)]/50 bg-black/40 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/50"
                        />
                        <button
                          type="button"
                          disabled={updateStudentMut.isPending}
                          onClick={async () => {
                            if (!editingStudentName.trim() || editingStudentName.trim().length < 2) {
                              toast.error("Name must be at least 2 characters");
                              return;
                            }
                            try {
                              await updateStudentMut.mutateAsync({ id: student.id, name: editingStudentName.trim() });
                              toast.success("Student updated");
                              setEditingStudentId(null);
                              refetchStudents();
                            } catch { toast.error("Update failed"); }
                          }}
                          className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
                        >
                          {updateStudentMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStudentId(null)}
                          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-10">
                        <p className="text-sm font-bold text-white truncate flex-1">{student.name}</p>
                        <button
                          type="button"
                          onClick={() => { setEditingStudentId(student.id); setEditingStudentName(student.name); }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--ui-accent)] hover:bg-white/5 transition-all shrink-0 opacity-0 group-hover/student:opacity-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deleteStudentMut.isPending}
                          onClick={() => setStudentToDelete({ id: student.id, name: student.name })}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all shrink-0 opacity-0 group-hover/student:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!existingStudents || existingStudents.length === 0) && (
                <div className="p-10 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center grayscale opacity-30 gap-4">
                  <Users className="w-8 h-8 text-slate-600" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No students enrolled</p>
                </div>
              )}
            </div>

            {/* Add New Student */}
            {(existingStudents?.length ?? 0) < watch("numberOfStudents") && (
              <div className="flex gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    placeholder="New student name..."
                    className="flex-1 h-10 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newStudentName.trim()) {
                        e.preventDefault();
                        try {
                          await addStudentMut.mutateAsync({ groupId: selectedGroup!.id, name: newStudentName.trim() });
                          toast.success("Student added");
                          setNewStudentName("");
                          refetchStudents();
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to add student.");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={addStudentMut.isPending || !newStudentName.trim()}
                    onClick={async () => {
                      if (!newStudentName.trim()) return;
                      try {
                        await addStudentMut.mutateAsync({ groupId: selectedGroup!.id, name: newStudentName.trim() });
                        toast.success("Student added");
                        setNewStudentName("");
                        refetchStudents();
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to create group.");
                      }
                    }}
                    className="h-10 px-5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {addStudentMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ADD"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {wizardStep === 4 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="p-8 bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/20 rounded-3xl text-center space-y-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-[var(--ui-accent)] rounded-3xl mx-auto flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <PlayCircle className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t("groups.wizard.step4.ready")}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mx-auto max-w-xs">{t("groups.wizard.step4.finalizing")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-[var(--ui-bg)] border border-white/5 rounded-2xl space-y-1 hover:border-[var(--ui-accent)]/20 transition-colors">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.confirm_req")}</p>
                    <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      {t("groups.wizard.step4.verified")}
                    </p>
                </div>
                <div className="p-5 bg-[var(--ui-bg)] border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.target_group")}</p>
                    <p className="text-sm font-black text-[var(--ui-accent)] uppercase tracking-tight">{watch("name")}</p>
                </div>
                <div className="p-5 bg-[var(--ui-bg)] border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.cadet_count")}</p>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{watch("cadets")?.filter((c: any) => c.name).length} / {watch("numberOfStudents")} {t("groups.wizard.step4.enrolled")}</p>
                </div>
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">{t("groups.wizard.step4.encryption_active")}</p>
                </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-white/5 mt-8">
          {wizardStep > 1 && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setWizardStep(w => w - 1)} 
              className="flex-1"
            >
              <ChevronRight className="w-4 h-4 me-2 rotate-180 rtl:rotate-0" /> {t("groups.modal.back")}
            </Button>
          )}
          
          {wizardStep < 4 ? (
            <Button 
              type="button" 
              disabled={isSubmitting || checkName.isPending}
              onClick={handleNext} 
              className={cn("flex-1 h-12 shadow-[var(--ui-accent)]/20", wizardStep === 1 ? "col-span-2" : "")}
            >
              {checkName.isPending ? t("common.loading") : t("groups.modal.next", { next: wizardStep + 1 })} 
              <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting || isSubmitting} className="flex-1 h-12 shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white">
              {(submitting || isSubmitting) ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "create" ? t("groups.modal.submit_create") : t("groups.modal.submit_edit")}
            </Button>
          )}
        </div>
      </form>
      
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={async () => {
          if (!studentToDelete) return;
          try {
            await deleteStudentMut.mutateAsync(studentToDelete.id);
            toast.success("Student removed");
            setStudentToDelete(null);
            refetchStudents();
          } catch {
            toast.error("Delete failed");
          }
        }}
        isLoading={deleteStudentMut.isPending}
        title="Remove Student"
        description="This will remove the student from the group roster. They can be re-enrolled later."
        entityName={studentToDelete?.name}
        confirmText="REMOVE"
      />
    </Modal>
  );
};
