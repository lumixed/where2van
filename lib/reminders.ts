import { dayKey, fromDayKey } from "./dates";
import type { Place } from "./types";

/** A to-do with no date starts to count as forgotten after this many days. */
const WAITING_DAYS = 60;
const MAX = 4;

export type Reminder =
  /** Planned for today or tomorrow. */
  | { kind: "today" | "tomorrow"; place: Place }
  /** The planned day has passed and it is still to do. */
  | { kind: "overdue"; place: Place }
  /** Sitting in To do for a long time with no plan. */
  | { kind: "waiting"; place: Place; days: number };

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * What is worth a nudge right now, most urgent first: plans for today and
 * tomorrow, plans that slipped past, and the one to-do that has waited longest.
 */
export function reminders(places: Place[], today = dayKey()): Reminder[] {
  const now = fromDayKey(today);
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  const tomorrow = dayKey(next);

  const todo = places.filter((p) => p.status === "want");
  const planned = todo
    .filter((p) => p.plannedFor)
    .sort((a, b) =>
      (a.plannedFor! + a.plannedTime).localeCompare(b.plannedFor! + b.plannedTime),
    );

  const out: Reminder[] = [
    ...planned.filter((p) => p.plannedFor === today).map((place) => ({ kind: "today" as const, place })),
    ...planned.filter((p) => p.plannedFor === tomorrow).map((place) => ({ kind: "tomorrow" as const, place })),
    // The most recently missed plan first.
    ...planned.filter((p) => p.plannedFor! < today).reverse().map((place) => ({ kind: "overdue" as const, place })),
  ];

  // Only the single oldest forgotten place, so this never turns into a nag list.
  const oldest = todo
    .filter((p) => !p.plannedFor)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (oldest) {
    const days = daysBetween(new Date(oldest.createdAt), now);
    if (days >= WAITING_DAYS) out.push({ kind: "waiting", place: oldest, days });
  }
  return out.slice(0, MAX);
}

/** "3 months", "9 weeks" */
export function formatWait(days: number): string {
  if (days >= 90) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 7)} weeks`;
}
