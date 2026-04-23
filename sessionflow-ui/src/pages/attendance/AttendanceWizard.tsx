import React, { useState } from "react";
import { Modal, Button, Input, Card } from "../../components/ui";
import { Check, X, Clock, Users, ArrowRight, Save, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Session } from "../../types";
import { useSession } from "../../queries/useSessionQueries";
import { StudentFeedback, AttendanceFormData, generateAttendanceFormUrl } from "./AttendanceGoogleFormService";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

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
  
  // Initialize form when session data is loaded
  React.useEffect(() => {
    const activeSession = detailedSession || session;
    if (activeSession && isOpen) {
      const scheduledDate = new Date(activeSession.scheduledAt);
      const dateStr = format(scheduledDate, "yyyy-MM-dd");
      const startTimeStr = format(scheduledDate, "HH:mm");
      
      let endTimeStr = "";
      if (activeSession.durationMinutes) {
        const endDate = new Date(scheduledDate.getTime() + activeSession.durationMinutes * 60000);
        endTimeStr = format(endDate, "HH:mm");
      }

      // detailedSession.students from GET /api/sessions/{id}
      const students = (detailedSession as any)?.students || activeSession.group?.students || [];

      setFormData({
        groupName: activeSession.groupName || "",
        dayOfWeek: scheduledDate.getDay(),
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

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleSubmit = () => {
    const url = generateAttendanceFormUrl(formData as AttendanceFormData);
    // Open in new tab
    window.open(url, "_blank");
    onClose();
  };

  if (!session || !formData.students) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("attendance.wizard_title") || "Make Attendance"}
      subtitle={session.groupName}
      className="max-w-4xl"
    >
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 -z-10" />
        {[1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              "flex flex-col items-center gap-2",
              step >= s ? "text-[var(--ui-accent)]" : "text-slate-500"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 transition-colors",
              step >= s ? "bg-black border-[var(--ui-accent)] shadow-glow shadow-[var(--ui-accent)]/20" : "bg-black border-white/5"
            )}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold">
              {s === 1 ? t("attendance.step_details") || "Details" : t("attendance.step_students") || "Students"}
            </span>
          </div>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar px-2 -mx-2">
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</label>
                <Input value={formData.date} disabled className="bg-white/5" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lecture Number</label>
                <Input value={formData.lectureNumber} type="number" onChange={(e) => setFormData({ ...formData, lectureNumber: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Start Time</label>
                <Input value={formData.startTime} disabled className="bg-white/5" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">End Time</label>
                <Input value={formData.endTime} disabled className="bg-white/5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Is this the last lecture in the level?</label>
                <div className="flex gap-2">
                  <Button variant={formData.isLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isLastLecture: true })} className="flex-1">Yes</Button>
                  <Button variant={!formData.isLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isLastLecture: false })} className="flex-1">No</Button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Is the next lecture the last?</label>
                <div className="flex gap-2">
                  <Button variant={formData.isNextLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isNextLastLecture: true })} className="flex-1">Yes</Button>
                  <Button variant={!formData.isNextLastLecture ? "primary" : "outline"} onClick={() => setFormData({ ...formData, isNextLastLecture: false })} className="flex-1">No</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Session Notes</label>
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] transition-all min-h-[100px]"
                placeholder="Any special notes about this session..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {formData.students.length > 6 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start animate-in fade-in slide-in-from-top-4">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-500 uppercase tracking-tight">Student Limit Notice</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The current Google Form only supports up to 6 students. 
                    Only the first 6 students listed below will be exported.
                  </p>
                </div>
              </div>
            )}
            {formData.students.map((student, idx) => (
              <Card key={student.id} className="p-4 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-white text-lg">{student.name}</span>
                  </div>
                  <div className="flex bg-black rounded-lg border border-white/5 p-1">
                    <button 
                      onClick={() => updateStudent(student.id, { isPresent: true })}
                      className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", student.isPresent ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-white")}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => updateStudent(student.id, { isPresent: false })}
                      className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", !student.isPresent ? "bg-rose-500/20 text-rose-400" : "text-slate-500 hover:text-white")}
                    >
                      Absent
                    </button>
                  </div>
                </div>

                {student.isPresent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[
                        { key: "attendanceOnTime", label: "Attendance on time" },
                        { key: "taskSubmission", label: "Task submission" },
                        { key: "interaction", label: "Interaction during session" },
                        { key: "research", label: "Research ability" },
                        { key: "teamwork", label: "Teamwork" }
                      ].map(metric => (
                        <div key={metric.key} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                          <span className="text-xs font-bold text-slate-300 ml-2">{metric.label}</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => updateStudent(student.id, { [metric.key]: "Yes" })}
                              className={cn("px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors", (student as any)[metric.key] === "Yes" ? "bg-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : "bg-white/5 text-slate-400")}
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => updateStudent(student.id, { [metric.key]: "Needs Improvement" })}
                              className={cn("px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors", (student as any)[metric.key] === "Needs Improvement" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-400")}
                            >
                              Needs Improv.
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Input 
                        placeholder="Additional comments for this student..." 
                        value={student.comment}
                        onChange={(e) => updateStudent(student.id, { comment: e.target.value })}
                        className="bg-black/40 h-9 text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </Card>
            ))}
            
            {formData.students.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                No students enrolled in this group.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={step === 1 ? onClose : handleBack}>
          {step === 1 ? t("common.cancel") || "Cancel" : t("common.back") || "Back"}
        </Button>
        <Button 
          variant="primary" 
          className="gap-2"
          onClick={step === 2 ? handleSubmit : handleNext}
        >
          {step === 2 ? (
            <>
              <FileText className="w-4 h-4" />
              Generate Google Form
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
