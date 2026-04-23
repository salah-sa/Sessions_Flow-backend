export interface StudentFeedback {
  id: string;
  name: string;
  isPresent: boolean;
  attendanceOnTime: "Yes" | "Needs Improvement";
  taskSubmission: "Yes" | "Needs Improvement";
  interaction: "Yes" | "Needs Improvement";
  research: "Yes" | "Needs Improvement";
  teamwork: "Yes" | "Needs Improvement";
  comment: string;
}

export interface AttendanceFormData {
  groupName: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  lectureNumber: number;
  isLastLecture: boolean;
  isNextLastLecture: boolean;
  notes: string;
  students: StudentFeedback[];
}

// Arabic day names matching the form exactly
const DAY_MAP = ["الأحد", "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة", "السبت"];

const FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc3cVcgcW99zHpAHO9gZYOSiN5gYT8lhOrRW4oFNUStHnHb7w/viewform?usp=pp_url";

const ENTRY_IDS = {
  groupName: "entry.547163657",
  dayOfWeek: "entry.176364019",
  startTime: "entry.481499408",
  endTime: "entry.266996152",
  date: "entry.1713053362",
  lectureNumber: "entry.1157022992",
  isLastLecture: "entry.1384758985",
  isNextLastLecture: "entry.441454399",
  notes: "entry.1853543247",
  absences: "entry.1127074942",
  children: [
    "entry.473875877",
    "entry.597047983",
    "entry.565332936",
    "entry.1725609232",
    "entry.633078613",
    "entry.1353208873"
  ]
};

const formatFeedback = (s: StudentFeedback): string => {
  if (!s.isPresent) return "غائب (Absent)";
  
  const mapEval = (val: "Yes" | "Needs Improvement") => val === "Yes" ? "ممتاز" : "يحتاج تحسين";
  
  return `الاسم: ${s.name}
الحضور في الموعد: ${mapEval(s.attendanceOnTime)}
تسليم التاسك: ${mapEval(s.taskSubmission)}
التفاعل اثناء السيشن: ${mapEval(s.interaction)}
مهارة البحث: ${mapEval(s.research)}
العمل الجماعي: ${mapEval(s.teamwork)}
تعليق إضافي: ${s.comment || "لا يوجد"}`;
};

export const generateAttendanceFormUrl = (data: AttendanceFormData): string => {
  const params = new URLSearchParams();

  params.append(ENTRY_IDS.groupName, data.groupName);
  params.append(ENTRY_IDS.dayOfWeek, DAY_MAP[data.dayOfWeek] || "");
  params.append(ENTRY_IDS.startTime, data.startTime);
  params.append(ENTRY_IDS.endTime, data.endTime);
  params.append(ENTRY_IDS.date, data.date);
  params.append(ENTRY_IDS.lectureNumber, data.lectureNumber.toString());
  params.append(ENTRY_IDS.isLastLecture, data.isLastLecture ? "نعم" : "لا");
  params.append(ENTRY_IDS.isNextLastLecture, data.isNextLastLecture ? "نعم" : "لا");
  params.append(ENTRY_IDS.notes, data.notes || "لا يوجد");

  // Handle Absences
  const absentStudents = data.students.filter(s => !s.isPresent).map(s => s.name);
  params.append(ENTRY_IDS.absences, absentStudents.length > 0 ? absentStudents.join("، ") : "لا يوجد");

  // Handle up to 6 children
  for (let i = 0; i < 6; i++) {
    const student = data.students[i];
    const entryId = ENTRY_IDS.children[i];
    if (student) {
      params.append(entryId, formatFeedback(student));
    } else {
      params.append(entryId, "لا يوجد");
    }
  }

  return `${FORM_BASE_URL}&${params.toString()}`;
};
