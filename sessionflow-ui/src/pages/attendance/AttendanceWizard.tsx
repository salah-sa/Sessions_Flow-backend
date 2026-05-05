import React, { useState } from "react";
import { Modal, Button, Input, Card } from "../../components/ui";
import { Check, Clock, Users, ArrowRight, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Session } from "../../types";
import { useSession, useSessionMutations } from "../../queries/useSessionQueries";
import { StudentFeedback, AttendanceFormData, generateAttendanceFormUrl } from "./AttendanceGoogleFormService";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn, formatDateTo12h, formatTime12h } from "../../lib/utils";

interface AttendanceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export const AttendanceWizard: React.FC<AttendanceWizardProps> = ({ isOpen, onClose, session }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  
  // Form State
  const [formData, setFormData] = useState<Partial<AttendanceFormData>>({});
  
  // Fetch complete session data including students when the modal opens
  const { data: detailedSession } = useSession(session?.id);
  const { startMutation, updateAttendanceMutation } = useSessionMutations();
  
  // Initialize form when session data is loaded
  React.useEffect(() => {
    const activeSession = detailedSession || session;
    if (activeSession && isOpen) {
      // Backend stores Cairo local time AS UTC — extract raw UTC values
      const raw = new Date(activeSession.scheduledAt);
      const h = raw.getHours();
      const m = raw.getMinutes();
      const dateStr = format(raw, "yyyy-MM-dd");
      
      const startTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endH = (h + 2) % 24;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // detailedSession.students from GET /api/sessions/{id}
      const students = (detailedSession as any)?.students || activeSession.group?.students || [];

      setFormData({
        groupName: activeSession.groupName || "",
        dayOfWeek: raw.getDay(),
        startTime: startTimeStr,
        endTime: endTimeStr,
        date: dateStr,
        lectureNumber: activeSession.sessionNumber || 1,
        isLastLecture: false,
        isNextLastLecture: false,
        notes: "",
        students: students.map((s: any) => ({
          id: s.id,
          name: s.name,
          isPresent: true,
          attendanceOnTime: "Yes",
          taskSubmission: "Yes",
          interaction: "Yes",
          research: "Yes",
          teamwork: "Yes",
          comment: ""
        }))
      });
      setStep(1);
    }
  }, [detailedSession, session, isOpen]);

  const updateStudent = (studentId: string, updates: Partial<StudentFeedback>) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students?.map(s => s.id === studentId ? { ...s, ...updates } : s)
    }));
  };

  const markAllAsPresent = () => {
    setFormData(prev => ({
      ...prev,
      students: prev.students?.map(s => ({
        ...s,
        isPresent: true,
        attendanceOnTime: "Yes",
        taskSubmission: "Yes",
        interaction: "Yes",
        research: "Yes",
        teamwork: "Yes"
      }))
    }));
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    const activeSession = detailedSession || session;
    if (!activeSession) return;

    // 1. Ensure the session is started if it's currently Scheduled
    if (activeSession.status === "Scheduled") {
      try {
         await startMutation.mutateAsync(activeSession.id);
      } catch (e: any) {
         console.error("Failed to start session.", e);
         // Don't block — the session may already be active
      }
    }

    // 2. Persist attendance records to MongoDB BEFORE opening the Google Form
    if (formData.students && formData.students.length > 0) {
      try {
        const records = formData.students.map(s => ({
          studentId: s.id,
          status: (s.isPresent ? "Present" : "Absent") as import("../../types").AttendanceStatus
        }));
        await updateAttendanceMutation.mutateAsync({ id: activeSession.id, records });
      } catch (e: any) {
        console.error("Failed to persist attendance.", e);
        // Continue — the form will still open
      }
    }

    // 3. Generate and open Google Form URL
    const url = generateAttendanceFormUrl(formData as AttendanceFormData);
    window.open(url, "_blank");
    
    // 4. Notify parent to show the "Complete Attendance" confirmation dialog
    if ((window as any).onWizardComplete) {
       (window as any).onWizardComplete(activeSession.id);
    }
    
    onClose();
  };

  if (!session || !formData.students) return null;

  const steps = [
    { id: 1, label: "Identification" },
    { id: 2, label: "Time Details" },
    { id: 3, label: "Attendance" },
    { id: 4, label: "Additional Data" }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guided Attendance"
      subtitle={session.groupName}
      className="max-w-4xl w-full mx-4"
    >
      {/* Progress Bar Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 -z-10" />
        {steps.map((s) => (
          <div
            key={s.id}
            className={cn(
              "flex flex-col items-center gap-2",
              step >= s.id ? "text-[var(--ui-accent)]" : "text-slate-500"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 transition-colors",
              step >= s.id ? "bg-black border-[var(--ui-accent)] shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.3)]" : "bg-black border-white/5"
            )}>
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold hidden sm:block">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[40vh] max-h-[60vh] overflow-y-auto custom-scrollbar px-1 -mx-2 pb-4">
        
        {/* Step 1: Session Identification */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl mx-auto pt-4">
            <div className="text-center mb-8">
               <h3 className="text-xl font-bold text-white">Session Identification</h3>
               <p className="text-sm text-slate-400">Confirm the basic details of this lecture.</p>
            </div>
            <div className="space-y-2 text-start">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</label>
              <Input value={formData.date} disabled className="bg-white/5 h-12 text-lg font-medium" />
            </div>
            <div className="space-y-2 text-start">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText className="w-4 h-4"/> Lecture Number</label>
              <Input 
                value={formData.lectureNumber} 
                type="number" 
                onChange={(e) => setFormData({ ...formData, lectureNumber: parseInt(e.target.value) || 1 })} 
                className="h-12 text-lg font-medium focus:border-[var(--ui-accent)]" 
              />
            </div>
          </motion.div>
        )}

        {/* Step 2: Time Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl mx-auto pt-4">
            <div className="text-center mb-8">
               <h3 className="text-xl font-bold text-white">Time Details</h3>
               <p className="text-sm text-slate-400">Review the start and end times. End time is strictly +2 hours by default.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-start">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4"/> Start Time ({formatTime12h(formData.startTime || null)})
                </label>
                <Input 
                  value={formData.startTime} 
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="bg-white/5 h-12 text-lg font-medium font-mono" 
                />
              </div>
              <div className="space-y-2 text-start">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500"/> End Time ({formatTime12h(formData.endTime || null)})
                </label>
                <Input 
                  value={formData.endTime} 
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="bg-white/5 h-12 text-lg font-medium font-mono border-emerald-500/30 focus:border-emerald-500" 
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Attendance Marking */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-[var(--ui-accent)]"/> Attendance Marking</h3>
                <p className="text-sm text-slate-400 text-start mt-1">Review metrics for present students.</p>
              </div>
              <Button variant="outline" className="border-[var(--ui-accent)] text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 text-xs h-9" onClick={markAllAsPresent}>
                <CheckCircle2 className="w-4 h-4 mr-2"/>
                Mark All as Present (Default Metrics)
              </Button>
            </div>

            {formData.students.length > 6 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-start">
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-tight">Student Limit Notice</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The Google Form only supports 6 detailed students. 
                    Only the first 6 will have metrics exported.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {formData.students.map((student, idx) => (
                <Card key={student.id} className="p-4 border border-white/5 bg-white/[0.02]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-white text-base sm:text-lg truncate">{student.name}</span>
                    </div>
                    <div className="flex bg-black rounded-lg border border-white/5 p-1 w-full sm:w-auto">
                      <button 
                        onClick={() => updateStudent(student.id, { isPresent: true })}
                        className={cn("flex-1 sm:flex-initial px-6 py-2 rounded-md text-xs font-bold transition-all", student.isPresent ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-white")}
                      >
                        Present
                      </button>
                      <button 
                        onClick={() => updateStudent(student.id, { isPresent: false })}
                        className={cn("flex-1 sm:flex-initial px-6 py-2 rounded-md text-xs font-bold transition-all", !student.isPresent ? "bg-rose-500/20 text-rose-400" : "text-slate-500 hover:text-white")}
                      >
                        Absent
                      </button>
                    </div>
                  </div>

                  {student.isPresent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-white/5 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                          { key: "attendanceOnTime", label: "On time" },
                          { key: "taskSubmission", label: "Task" },
                          { key: "interaction", label: "Interaction" },
                          { key: "research", label: "Research" },
                          { key: "teamwork", label: "Teamwork" }
                        ].map(metric => (
                          <div key={metric.key} className="flex flex-col gap-2 bg-black/40 p-3 rounded-lg border border-white/5 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</span>
                            <div className="flex gap-1 w-full">
                              <button 
                                onClick={() => updateStudent(student.id, { [metric.key]: "Yes" })}
                                className={cn("flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-colors", (student as any)[metric.key] === "Yes" ? "bg-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : "bg-white/5 text-slate-500")}
                              >
                                Yes
                              </button>
                              <button 
                                onClick={() => updateStudent(student.id, { [metric.key]: "Needs Improvement" })}
                                className={cn("flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-colors", (student as any)[metric.key] === "Needs Improvement" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-500")}
                              >
                                Needs Dev
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <Input 
                          placeholder="Specific advice or comment for the child..." 
                          value={student.comment}
                          onChange={(e) => updateStudent(student.id, { comment: e.target.value })}
                          className="bg-black/40 h-11 text-sm focus:border-[var(--ui-accent)]"
                        />
                      </div>
                    </motion.div>
                  )}
                </Card>
              ))}
              
              {formData.students.length === 0 && (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 text-slate-400 text-sm">
                  No students enrolled in this group.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Additional Data */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl mx-auto pt-4">
             <div className="text-center mb-8">
               <h3 className="text-xl font-bold text-white">Additional Details</h3>
               <p className="text-sm text-slate-400">Final checks before form submission.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="space-y-4 text-start">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Is this the last lecture in the level?</label>
                <div className="flex gap-2">
                  <Button variant={formData.isLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isLastLecture: true })} className="flex-1 h-12 text-xs uppercase font-bold tracking-widest border-[var(--ui-accent)]">Yes</Button>
                  <Button variant={!formData.isLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isLastLecture: false })} className="flex-1 h-12 text-xs uppercase font-bold tracking-widest">No</Button>
                </div>
              </div>
              <div className="space-y-4 text-start">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Is the NEXT lecture the last?</label>
                <div className="flex gap-2">
                  <Button variant={formData.isNextLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isNextLastLecture: true })} className="flex-1 h-12 text-xs uppercase font-bold tracking-widest border-[var(--ui-accent)]">Yes</Button>
                  <Button variant={!formData.isNextLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isNextLastLecture: false })} className="flex-1 h-12 text-xs uppercase font-bold tracking-widest">No</Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-start">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">General Session Notes</label>
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] transition-all min-h-[120px] custom-scrollbar"
                placeholder="Any special notes about this session or general feedback..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </motion.div>
        )}

      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={step === 1 ? onClose : handleBack} className="w-32">
          {step === 1 ? t("common.cancel") || "Cancel" : t("common.back") || "Back"}
        </Button>
        
        {/* Step indicator bubbles for quick jump if valid (optional) */}
        <div className="hidden sm:flex gap-1.5">
           {steps.map(s => (
             <div key={s.id} className={cn("w-2 h-2 rounded-full transition-all", step === s.id ? "w-6 bg-[var(--ui-accent)]" : step > s.id ? "bg-[var(--ui-accent)]/40" : "bg-white/10")} />
           ))}
        </div>

        <Button 
          variant="primary" 
          className={cn("gap-2 w-48 shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.2)]", step === 4 && "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white")}
          onClick={step === 4 ? handleSubmit : handleNext}
        >
          {step === 4 ? (
            <>
              <FileText className="w-4 h-4" />
              Submit to Form
            </>
          ) : (
            <>
              Next Step
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};
