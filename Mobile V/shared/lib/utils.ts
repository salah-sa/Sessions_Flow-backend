export function formatTime12h(time: string | null) {
  if (!time) return "--:--";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  
  return `${h12}:${minutes} ${ampm}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
