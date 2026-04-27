import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Card, Badge } from "../../components/ui";
import { 
  Check, 
  Clock, 
  Users, 
  ArrowRight, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  Loader2, 
  ShieldCheck,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Session } from "../../types";
import { useSession, useSessionMutations } from "../../queries/useSessionQueries";
import { StudentFeedback, AttendanceFormData, generateAttendanceFormUrl } from "./AttendanceGoogleFormService";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateTo12h, formatTime12h } from "../../lib/utils";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";

interface AttendanceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export const AttendanceWizard: React.FC<AttendanceWizardProps> = ({ isOpen, onClose, session }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Form State
  const [formData, setFormData] = useState<Partial<AttendanceFormData>>({});
  
  // Fetch complete session data
  const { data: detailedSession } = useSession(session?.id);
  const { startMutation, endMutation } = useSessionMutations();
  
  // Initialize form
  useEffect(() => {
    const activeSession = detailedSession || session;
    if (activeSession && isOpen) {
      const raw = new Date(activeSession.scheduledAt);
      const h = raw.getHours();
      const m = raw.getMinutes();
      const dateStr = format(raw, "yyyy-MM-dd");
      
      const startTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endH = (h + 2) % 24;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

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
      setIsCompleting(false);
      setCountdown(3);
    }
  }, [detailedSession, session, isOpen]);

  // Countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCompleting && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (isCompleting && countdown === 0) {
      handleFinalize();
    }
    return () => clearTimeout(timer);
  }, [isCompleting, countdown]);

  const updateStudent = (studentId: string, updates: Partial<StudentFeedback>) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students?.map(s => s.id === studentId ? { ...s, ...updates } : s)
    }));
  };

  const markAllAsPresent = () => {
    sounds.playHover();
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

  const handleNext = () => {
    sounds.playHover();
    setStep(prev => Math.min(prev + 1, 4));
  };
  const handleBack = () => {
    sounds.playHover();
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const activeSession = detailedSession || session;
    if (!activeSession) return;

    // 1. Ensure the session is started locally
    if (activeSession.status === "Scheduled") {
      try {
         await startMutation.mutateAsync(activeSession.id);
      } catch (e) {
         console.error("Failed to start session natively.", e);
      }
    }

    // 2. Open Google Form
    const url = generateAttendanceFormUrl(formData as AttendanceFormData);
    window.open(url, "_blank");
    
    // 3. Trigger Auto-Completion UI
    sounds.playSessionComplete();
    setIsCompleting(true);
  };

  const handleFinalize = async () => {
    const activeSession = detailedSession || session;
    if (!activeSession) return;

    try {
      await endMutation.mutateAsync({ 
        id: activeSession.id, 
        force: true, 
        notes: `Auto-completed via Attendance Wizard. Notes: ${formData.notes || "None"}`
      });
      sounds.playArchive();
      toast.success("Mission Success. Session archived.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Tactical error during finalization.");
      setIsCompleting(false);
      setCountdown(3);
    }
  };

  if (!session || !formData.students) return null;

  const steps = [
    { id: 1, label: "Identification", icon: ShieldCheck },
    { id: 2, label: "Time Intel", icon: Clock },
    { id: 3, label: "Cadet Status", icon: Users },
    { id: 4, label: "Final Report", icon: FileText }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isCompleting ? () => {} : onClose}
      title="Attendance Wizard"
      subtitle={`Tactical deployment for ${session.groupName}`}
      className="max-w-4xl w-full mx-4 attendance-realm"
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          {isCompleting ? (
            <motion.div 
              key="completing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{countdown}</span>
                </div>
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Tactical Sync in Progress</h2>
              <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
                Google Form launched. Markings are being uploaded to HQ. <br/>
                <span className="text-emerald-500 font-bold">Auto-archiving in {countdown}s...</span>
              </p>
            </motion.div>
          ) : (
            <motion.div key="wizard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Premium Progress Bar */}
              <div className="flex items-center justify-between mb-12 relative px-4">
                <div className="absolute inset-x-8 top-[1.125rem] h-px bg-white/5 -z-10" />
                {steps.map((s) => {
                  const Icon = s.icon;
                  const isActive = step >= s.id;
                  const isCurrent = step === s.id;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-3 relative">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                        isActive 
                          ? "bg-black border-[var(--att-ember)] shadow-[0_0_20px_rgba(249,115,22,0.2)]" 
                          : "bg-white/[0.02] border-white/5"
                      )}>
                        {step > s.id ? <Check className="w-5 h-5 text-emerald-500" /> : <Icon className={cn("w-4 h-4", isActive ? "text-[var(--att-ember)]" : "text-slate-600")} />}
                      </div>
                      <span className={cn(
                        "text-[9px] uppercase tracking-[0.2em] font-black transition-colors hidden sm:block",
                        isCurrent ? "text-white" : "text-slate-600"
                      )}>
                        {s.label}
                      </span>
                      {isCurrent && (
                        <motion.div layoutId="step-indicator" className="absolute -bottom-2 w-1 h-1 rounded-full bg-[var(--att-ember)] shadow-[0_0_8px_var(--att-ember)]" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step Content Wrapper */}
              <div className="min-h-[45vh] max-h-[60vh] overflow-y-auto custom-scrollbar px-2 -mx-2 pb-6">
                
                {/* Step 1: Identification */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-xl mx-auto pt-4">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--att-ember)]"/> Mission Date
                        </label>
                        <div className="h-14 px-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center text-white font-bold text-lg">
                          {formData.date}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[var(--att-ember)]"/> Session Number
                          </label>
                          <Input 
                            value={formData.lectureNumber} 
                            type="number" 
                            onChange={(e) => setFormData({ ...formData, lectureNumber: parseInt(e.target.value) || 1 })} 
                            className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white font-black text-xl focus:border-[var(--att-ember)]" 
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500"/> Lecture Topic
                          </label>
                          <Input 
                            value={formData.lectureTopic || ""} 
                            placeholder="e.g. Variables in Python"
                            onChange={(e) => setFormData({ ...formData, lectureTopic: e.target.value })} 
                            className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white font-medium text-sm focus:border-amber-500 placeholder-slate-600" 
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Verify session number matches the physical count. Topic is optional but recommended.</p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Time Details */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-xl mx-auto pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[var(--att-ember)]"/> Entry Time
                        </label>
                        <Input 
                          value={formData.startTime} 
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white font-mono text-xl focus:border-[var(--att-ember)] text-center" 
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-500"/> Extraction Time
                        </label>
                        <Input 
                          value={formData.endTime} 
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="h-14 rounded-2xl bg-white/[0.03] border-emerald-500/20 text-white font-mono text-xl focus:border-emerald-500 text-center" 
                        />
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                       <Zap className="w-5 h-5 text-[var(--att-ember)] shrink-0" />
                       <p className="text-xs text-slate-400 leading-relaxed font-medium">
                         The system enforces a strict <span className="text-white font-bold">2-hour window</span> for all deployments. Verify if manual adjustment is required for overtime.
                       </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Attendance Marking */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 bg-[var(--att-surface)] z-10 py-2 border-b border-white/5 mb-6">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">Cadet Verification</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mark mission presence and metrics</p>
                      </div>
                      <Button variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl" onClick={markAllAsPresent}>
                        <CheckCircle2 className="w-4 h-4 mr-2"/>
                        Mass Deploy (Full Metrics)
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {formData.students.map((student, idx) => (
                        <Card key={student.id} className="p-6 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all rounded-3xl overflow-hidden relative group">
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1 transition-colors", student.isPresent ? "bg-emerald-500" : "bg-rose-500")} />
                          
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center font-black text-slate-400 group-hover:text-[var(--att-ember)] transition-colors shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-lg truncate">{student.name}</h4>
                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest bg-transparent border-none p-0", student.isPresent ? "text-emerald-500" : "text-rose-500")}>
                                  {student.isPresent ? "Verified Present" : "Missing in Action"}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-1 bg-black rounded-2xl border border-white/5 shrink-0">
                              <button 
                                onClick={() => { sounds.playHover(); updateStudent(student.id, { isPresent: true }); }}
                                className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", student.isPresent ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => { sounds.playHover(); updateStudent(student.id, { isPresent: false }); }}
                                className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", !student.isPresent ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}
                              >
                                Absent
                              </button>
                            </div>
                          </div>

                          {student.isPresent && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-8 pt-8 border-t border-white/5">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                                {[
                                  { key: "attendanceOnTime", label: "Punctual" },
                                  { key: "taskSubmission", label: "Task Done" },
                                  { key: "interaction", label: "Interacted" },
                                  { key: "research", label: "Research" },
                                  { key: "teamwork", label: "Teamwork" }
                                ].map(metric => (
                                  <div key={metric.key} className="flex flex-col gap-2 p-3 rounded-2xl bg-black/40 border border-white/5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">{metric.label}</span>
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => { sounds.playHover(); updateStudent(student.id, { [metric.key]: "Yes" }); }}
                                        className={cn("flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-colors", (student as any)[metric.key] === "Yes" ? "bg-[var(--att-ember)]/20 text-[var(--att-ember)] border border-[var(--att-ember)]/30" : "bg-white/5 text-slate-600")}
                                      >
                                        Yes
                                      </button>
                                      <button 
                                        onClick={() => { sounds.playHover(); updateStudent(student.id, { [metric.key]: "Needs Improvement" }); }}
                                        className={cn("flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-colors", (student as any)[metric.key] === "Needs Improvement" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-white/5 text-slate-600")}
                                      >
                                        Dev
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Input 
                                placeholder="Deployment performance notes..." 
                                value={student.comment}
                                onChange={(e) => updateStudent(student.id, { comment: e.target.value })}
                                className="bg-black/40 h-12 rounded-xl text-sm border-white/5 focus:border-[var(--att-ember)]"
                              />
                            </motion.div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Final Report */}
                {step === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-xl mx-auto pt-4">
                    <div className="grid grid-cols-1 gap-8">
                      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">End of Cycle Verification</label>
                          <div className="flex flex-col gap-3">
                            <button
                              onClick={() => { sounds.playHover(); setFormData({ ...formData, isLastLecture: !formData.isLastLecture }); }}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                formData.isLastLecture 
                                  ? "bg-[var(--att-ember)]/10 border-[var(--att-ember)]/40 text-[var(--att-ember)]" 
                                  : "bg-black/40 border-white/5 text-slate-500"
                              )}
                            >
                              <div className="flex flex-col text-start">
                                <span className="font-bold text-sm">Final Session of Level</span>
                                <span className="text-[10px] font-medium opacity-60">Automate graduation sequence</span>
                              </div>
                              {formData.isLastLecture && <Sparkles className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => { sounds.playHover(); setFormData({ ...formData, isNextLastLecture: !formData.isNextLastLecture }); }}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                formData.isNextLastLecture 
                                  ? "bg-amber-500/10 border-amber-500/40 text-amber-500" 
                                  : "bg-black/40 border-white/5 text-slate-500"
                              )}
                            >
                              <div className="flex flex-col text-start">
                                <span className="font-bold text-sm">Penultimate Session</span>
                                <span className="text-[10px] font-medium opacity-60">Prepare final evaluation</span>
                              </div>
                              {formData.isNextLastLecture && <ChevronRight className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Mission Debrief</label>
                          <textarea 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[var(--att-ember)] focus:ring-1 focus:ring-[var(--att-ember)] transition-all min-h-[140px] custom-scrollbar"
                            placeholder="Optional intel for the final report..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex gap-5">
                         <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                           <Zap className="w-6 h-6 text-emerald-500" />
                         </div>
                         <div className="space-y-1">
                            <h4 className="text-white font-bold text-sm">Automation Active</h4>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                              Submitting will launch Google Form and <span className="text-emerald-500 font-bold">automatically archive</span> this session in 3s.
                            </p>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between items-center mt-10 pt-8 border-t border-white/5">
                <Button variant="ghost" onClick={step === 1 ? onClose : handleBack} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-colors">
                  {step === 1 ? "Abort" : "Back"}
                </Button>
                
                <div className="hidden sm:flex gap-1.5">
                   {steps.map(s => (
                     <div key={s.id} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", step === s.id ? "w-6 bg-[var(--att-ember)]" : step > s.id ? "bg-[var(--att-ember)]/30" : "bg-white/10")} />
                   ))}
                </div>

                <Button 
                  variant="primary" 
                  className={cn(
                    "h-14 px-10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 transition-all duration-500 shadow-2xl",
                    step === 4 
                      ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)]" 
                      : "bg-[var(--att-gradient)] text-white shadow-[0_10px_30px_rgba(249,115,22,0.2)]"
                  )}
                  onClick={step === 4 ? handleSubmit : handleNext}
                >
                  {step === 4 ? (
                    <>
                      <Zap className="w-4 h-4 animate-pulse" />
                      Execute Sync
                    </>
                  ) : (
                    <>
                      Proceed
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
;
