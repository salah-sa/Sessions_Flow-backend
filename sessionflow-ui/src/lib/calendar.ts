import { Session } from "../types";
import { format } from "date-fns";

export const exportSessionsToICS = (sessions: Session[], filename: string = "sessions.ics") => {
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SessionFlow//Session Management//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  sessions.forEach(session => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

    const formatDate = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss'Z'");
    };

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${session.id}@sessionflow.local`);
    icsContent.push(`DTSTAMP:${formatDate(new Date())}`);
    icsContent.push(`DTSTART:${formatDate(start)}`);
    icsContent.push(`DTEND:${formatDate(end)}`);
    icsContent.push(`SUMMARY:Session: ${session.groupName}`);
    icsContent.push(`DESCRIPTION:Engineer: ${session.engineerName || 'Unassigned'}\\nStatus: ${session.status}`);
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
