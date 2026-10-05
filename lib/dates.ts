// Days are stored as local "YYYY-MM-DD" keys, so a plan or a memory never
// slides to the next day because of time zones.

export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Sat, Oct 12, 2026" */
export function formatDay(key: string): string {
  return fromDayKey(key).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "19:30" becomes "7:30 p.m." */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPlan(day: string, time: string): string {
  return time ? `${formatDay(day)} · ${formatTime(time)}` : formatDay(day);
}
