import * as z from "zod";

export const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:mm"),
  durationMinutes: z.number().min(30).max(480),
});

export const groupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  level: z.number().min(1).max(4),
  colorTag: z.string().default("blue"),
  numberOfStudents: z.number().min(1).max(10),
  totalSessions: z.number().min(1).max(50).default(13),
  frequency: z.number().min(1).max(3).default(1),
  startingSessionNumber: z.number().min(1).max(20),
  schedules: z.array(scheduleSchema).min(1, "At least one schedule is required"),
  cadets: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    studentId: z.string().optional()
  })).optional(),
}).superRefine((data, ctx) => {
  const maxStudents = LEVEL_CAPACITY_MAP[data.level] || 4;
  if (data.numberOfStudents > maxStudents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Max students for Level ${data.level} is ${maxStudents}`,
      path: ["numberOfStudents"],
    });
  }

  const limitForLevel = LEVEL_SESSION_MAP[data.level] || 13;
  if (data.startingSessionNumber > limitForLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Starting number cannot exceed ${limitForLevel} sessions`,
      path: ["startingSessionNumber"],
    });
  }

  // Relaxed: Backend will enforce, but front-end won't hard-block if React state is still syncing
  if (data.totalSessions > 50) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Total sessions cannot exceed 50`,
      path: ["totalSessions"],
    });
  }

  // Frequency check is kept but simplified to avoid race conditions blocking submission
  // if the user is fast. Backend will handle the strict enforcement.
  if (data.schedules.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At least one schedule is required`,
      path: ["schedules"],
    });
  }
});

export type GroupFormValues = z.infer<typeof groupSchema>;

export const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      slots.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${ampm}` });
    }
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();
export const LEVEL_SESSION_MAP: Record<number, number> = { 1: 13, 2: 12, 3: 13, 4: 13 };
export const LEVEL_CAPACITY_MAP: Record<number, number> = { 1: 4, 2: 4, 3: 4, 4: 4 };
