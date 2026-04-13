import { Session } from "../types";

export function getSessionStatus(session: Session) {
  const now = new Date();
  const start = new Date(session.scheduledAt);
  // Estimate end time if durationMinutes is present
  const end = session.durationMinutes 
    ? new Date(start.getTime() + session.durationMinutes * 60000)
    : new Date(start.getTime() + 60 * 60000); // Default 1hr

  if (session.endedAt) return "completed";
  if (session.startedAt) return "active";
  if (now > end) return "overdue";
  if (now > start) return "imminent";
  return "scheduled";
}

export function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function getWeekDays(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
