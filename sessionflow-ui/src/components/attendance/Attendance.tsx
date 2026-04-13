import React from "react";
import { User, Check, X, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, Button } from "../ui";
import { Student, AttendanceRecord, AttendanceStatus } from "../../types";

// StudentCard
interface StudentCardProps {
  student: Student;
  record?: AttendanceRecord;
  onStatusChange: (status: AttendanceStatus) => Promise<void>;
  disabled?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, record, onStatusChange, disabled }) => {
  const [isModifying, setIsModifying] = React.useState(false);
  const status = record?.status || "Unmarked";

  const handleStatusChange = async (newStatus: AttendanceStatus) => {
    if (isModifying) return;
    setIsModifying(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsModifying(false);
    }
  };

  return (
    <div className={cn(
      "card-base transition-all duration-500 flex flex-col group/student h-full",
      status === "Present" && "border-emerald-500/30 bg-emerald-500/5 shadow-glow shadow-emerald-500/5",
      status === "Late" && "border-amber-500/30 bg-amber-500/5 shadow-glow shadow-amber-500/5",
      status === "Absent" && "border-red-500/30 bg-red-500/5 shadow-glow shadow-red-500/5 opacity-80",
      status === "Unmarked" && "opacity-50"
    )}>
      <div className="p-4 space-y-4 flex-1">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/10 transition-all duration-700",
            status === "Present" ? "bg-emerald-500 shadow-glow-emerald" : 
            status === "Late" ? "bg-amber-500 shadow-glow-amber" : 
            status === "Absent" ? "bg-red-500 shadow-glow-red" : "bg-slate-800"
          )}>
            <span className="text-xs font-black uppercase tracking-tighter">{student.name.substring(0, 2)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-sora font-black text-xs truncate text-white uppercase tracking-tight">{student.name}</h3>
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em] mt-0.5">Deployment Unit</p>
          </div>
        </div>

        <div className="flex gap-1.5 pt-2">
           <button
             onClick={() => handleStatusChange("Present")}
             disabled={disabled || isModifying}
             className={cn(
               "flex-1 h-8 rounded-lg flex items-center justify-center transition-all",
               status === "Present" ? "bg-emerald-500 text-black font-black" : "bg-white/5 text-slate-500 hover:bg-white/10",
               isModifying && "opacity-50 cursor-not-allowed"
             )}
             title="Mark Present"
           >
             <Check className="w-3.5 h-3.5" />
           </button>
           <button
             onClick={() => handleStatusChange("Late")}
             disabled={disabled || isModifying}
             className={cn(
               "flex-1 h-8 rounded-lg flex items-center justify-center transition-all",
               status === "Late" ? "bg-amber-500 text-black font-black" : "bg-white/5 text-slate-500 hover:bg-white/10",
               isModifying && "opacity-50 cursor-not-allowed"
             )}
             title="Mark Late"
           >
             <Clock className="w-3.5 h-3.5" />
           </button>
           <button
             onClick={() => handleStatusChange("Absent")}
             disabled={disabled || isModifying}
             className={cn(
               "flex-1 h-8 rounded-lg flex items-center justify-center transition-all",
               status === "Absent" ? "bg-red-500 text-white font-black" : "bg-white/5 text-slate-500 hover:bg-white/10",
               isModifying && "opacity-50 cursor-not-allowed"
             )}
             title="Mark Absent"
           >
             <X className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <div className={cn(
        "px-4 py-2 border-t border-white/5 flex items-center justify-between",
        status === "Unmarked" ? "bg-slate-950/20" : "bg-white/[0.01]"
      )}>
         <span className={cn(
           "text-[8px] font-black uppercase tracking-widest",
           status === "Present" ? "text-emerald-500" :
           status === "Late" ? "text-amber-500" :
           status === "Absent" ? "text-red-500" : "text-slate-600"
         )}>
           {status}
         </span>
         {status !== "Unmarked" && <div className={cn("w-1 h-1 rounded-full animate-pulse", status === "Present" ? "bg-emerald-500" : status === "Late" ? "bg-amber-500" : "bg-red-500")} />}
      </div>
    </div>
  );
};

// AttendanceGrid
interface AttendanceGridProps {
  students: Student[];
  records: Record<string, AttendanceRecord>;
  onMarkStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  disabled?: boolean;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({ students, records, onMarkStatus, disabled }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          record={records[student.id]}
          onStatusChange={(status) => onMarkStatus(student.id, status)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
