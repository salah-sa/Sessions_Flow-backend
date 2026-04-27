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
  lectureTopic?: string; // Optional topic description
  isLastLecture: boolean;
  isNextLastLecture: boolean;
  notes: string;
  students: StudentFeedback[];
}

// Arabic day names matching the Google Form exactly
const DAY_MAP = ["الأحد", "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة", "السبت"];

const FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc3cVcgcW99zHpAHO9gZYOSiN5gYT8lhOrRW4oFNUStHnHb7w/viewform?usp=pp_url";

const ENTRY_IDS = {
  // Email consent: "Do you want to receive your response via this email?" → YES
  // Handled via URL param: emailReceipt=true
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

/**
 * Enhanced Feedback Formatter
 * 
 * Strict Format: [Child's Name] - (Attendance - Task Submission - Interaction Status - Short Advice)
 * Example: "Ahmed Ali - (Yes - Yes - Excellent - Keep it up!)"
 * Absent:  "Ahmed Ali - غائب (Absent)"
 */
const formatFeedback = (s: StudentFeedback): string => {
  if (!s.isPresent) {
    return `${s.name} - غائب (Absent)`;
  }
  
  const attendance = s.attendanceOnTime === "Yes" ? "Yes" : "No";
  const task = s.taskSubmission === "Yes" ? "Yes" : "No";
  
  // Interaction Status: derived from interaction + research + teamwork metrics
  const positiveMetrics = [s.interaction, s.research, s.teamwork].filter(v => v === "Yes").length;
  const status = positiveMetrics === 3 ? "Excellent" : positiveMetrics >= 2 ? "Good" : "Needs Improvement";
  
  // Short Advice: use the engineer's comment, or auto-generate from metrics
  const advice = s.comment || (positiveMetrics === 3 ? "Keep it up!" : "Needs more focus");
  
  return `${s.name} - (${attendance} - ${task} - ${status} - ${advice})`;
};

export const generateAttendanceFormUrl = (data: AttendanceFormData): string => {
  const params = new URLSearchParams();

  // ═══════════════════════════════════════════════
  // § 1. Email Consent → ALWAYS YES (via emailReceipt)
  // ═══════════════════════════════════════════════
  params.append("emailReceipt", "true");

  // ═══════════════════════════════════════════════
  // § 2. Group Name → Exact copy-paste
  // ═══════════════════════════════════════════════
  params.append(ENTRY_IDS.groupName, data.groupName);

  // ═══════════════════════════════════════════════
  // § 3. Session Details → Auto-filled from session data
  // ═══════════════════════════════════════════════
  params.append(ENTRY_IDS.dayOfWeek, DAY_MAP[data.dayOfWeek] || "");
  params.append(ENTRY_IDS.startTime, data.startTime);
  params.append(ENTRY_IDS.endTime, data.endTime);
  params.append(ENTRY_IDS.date, data.date);

  // ═══════════════════════════════════════════════
  // § 4. Lecture Info → Session number or topic
  // ═══════════════════════════════════════════════
  const lectureInfo = data.lectureTopic 
    ? `${data.lectureNumber} - ${data.lectureTopic}` 
    : data.lectureNumber.toString();
  params.append(ENTRY_IDS.lectureNumber, lectureInfo);

  // ═══════════════════════════════════════════════
  // § 5. Last Session Logic → From wizard toggles
  // ═══════════════════════════════════════════════
  params.append(ENTRY_IDS.isLastLecture, data.isLastLecture ? "نعم" : "لا");
  params.append(ENTRY_IDS.isNextLastLecture, data.isNextLastLecture ? "نعم" : "لا");

  // ═══════════════════════════════════════════════
  // § 6. Notes → Exact as provided, or "لا يوجد"
  // ═══════════════════════════════════════════════
  params.append(ENTRY_IDS.notes, data.notes || "لا يوجد");

  // ═══════════════════════════════════════════════
  // § 7. Absences → List absent students by name
  // ═══════════════════════════════════════════════
  const absentStudents = data.students.filter(s => !s.isPresent).map(s => s.name);
  params.append(ENTRY_IDS.absences, absentStudents.length > 0 ? absentStudents.join("، ") : "لا يوجد");

  // ═══════════════════════════════════════════════
  // § 8. Student Feedback → STRICT FORMAT per child (1–6)
  // Format: [Name] - (Attendance - Task - Status - Advice)
  // Missing child 5/6 → "لا يوجد"
  // ═══════════════════════════════════════════════
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

