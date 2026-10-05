"use client";

import { useState } from "react";
import { dayKey, formatDay, formatPlan, formatTime } from "@/lib/dates";
import { usePlaces } from "@/lib/store";
import type { Place } from "@/lib/types";
import { cn, PixelIcon } from "./pixel";
import PlaceRow from "./PlaceRow";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const COMING_UP = 5;

/** The day a place sits on in the calendar: the plan, or the day we went. */
function calendarDay(place: Place) {
  return place.status === "done" ? place.doneAt : place.plannedFor;
}

export default function CalendarView() {
  const places = usePlaces((s) => s.places);
  const planVisit = usePlaces((s) => s.planVisit);
  const today = dayKey();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), index: now.getMonth() };
  });
  const [day, setDay] = useState(today);

  const byDay = new Map<string, Place[]>();
  for (const place of places) {
    const key = calendarDay(place);
    if (key) byDay.set(key, [...(byDay.get(key) ?? []), place]);
  }

  const first = new Date(month.year, month.index, 1);
  const daysInMonth = new Date(month.year, month.index + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      dayKey(new Date(month.year, month.index, i + 1)),
    ),
  ];

  const step = (by: number) => {
    const next = new Date(month.year, month.index + by, 1);
    setMonth({ year: next.getFullYear(), index: next.getMonth() });
  };
  const goToday = () => {
    const now = new Date();
    setMonth({ year: now.getFullYear(), index: now.getMonth() });
    setDay(today);
  };

  const onDay = (byDay.get(day) ?? []).sort((a, b) =>
    a.plannedTime.localeCompare(b.plannedTime),
  );
  const unplanned = places.filter((p) => p.status === "want" && p.plannedFor !== day);
  const comingUp = places
    .filter((p) => p.status === "want" && p.plannedFor && p.plannedFor >= today)
    .sort((a, b) =>
      (a.plannedFor! + a.plannedTime).localeCompare(b.plannedFor! + b.plannedTime),
    )
    .slice(0, COMING_UP);

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div className="divider px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn px-2.5 py-2.5" onClick={() => step(-1)}>
            <PixelIcon name="left" />
            <span className="sr-only">Previous month</span>
          </button>
          <h3 className="flex-1 text-center font-bold" aria-live="polite">
            {first.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
          </h3>
          <button type="button" className="btn px-2 py-1.5 text-sm" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn px-2.5 py-2.5" onClick={() => step(1)}>
            <PixelIcon name="right" />
            <span className="sr-only">Next month</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((name, i) => (
            <span key={i} className="text-sm text-mute" aria-hidden>
              {name}
            </span>
          ))}
          {cells.map((key, i) => {
            if (!key) return <span key={`blank-${i}`} />;
            const items = byDay.get(key) ?? [];
            const plans = items.some((p) => p.status === "want");
            const memories = items.some((p) => p.status === "done");
            return (
              <button
                key={key}
                type="button"
                aria-pressed={day === key}
                aria-label={`${formatDay(key)}${items.length ? `, ${items.length} ${items.length === 1 ? "place" : "places"}` : ""}`}
                onClick={() => setDay(key)}
                className={cn(
                  "day flex h-11 flex-col items-center justify-center gap-0.5 border-[3px] font-semibold",
                  day === key
                    ? "border-ink bg-ink text-paper"
                    : key === today
                      ? "border-dashed border-ink/60 hover:bg-shade"
                      : "border-transparent hover:bg-shade",
                )}
              >
                {Number(key.slice(8))}
                <span className="flex h-2 gap-0.5">
                  {plans && <span className="dot bg-want" />}
                  {memories && <span className="dot bg-been" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center justify-center gap-3 text-sm text-mute">
          <span className="flex items-center gap-1.5">
            <span className="dot bg-want" /> Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="dot bg-been" /> Done
          </span>
        </p>
      </div>

      <section className="divider p-2" aria-label={formatDay(day)}>
        <h3 className="px-2 py-1 font-bold">{formatDay(day)}</h3>
        {onDay.length === 0 ? (
          <p className="px-2 pb-1 text-sm text-mute">Nothing on this day.</p>
        ) : (
          <ul>
            {onDay.map((place) => (
              <li key={place.id}>
                <PlaceRow
                  place={place}
                  detail={
                    place.status === "want"
                      ? place.plannedTime
                        ? `Planned · ${formatTime(place.plannedTime)}`
                        : "Planned"
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {unplanned.length > 0 && (
          <label className="mt-1 block px-2 pb-1">
            <span className="sr-only">Plan a to-do for this day</span>
            <select
              className="field text-sm"
              value=""
              onChange={(e) => {
                const place = places.find((p) => p.id === e.target.value);
                if (place) planVisit(place.id, day, place.plannedTime);
              }}
            >
              <option value="">+ Plan a to-do for this day…</option>
              {unplanned.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="p-2" aria-label="Coming up">
        <h3 className="px-2 py-1 font-bold">Coming up</h3>
        {comingUp.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-mute">
            No plans yet. Open a place and tap Plan a date.
          </p>
        ) : (
          <ul>
            {comingUp.map((place) => (
              <li key={place.id}>
                <PlaceRow
                  place={place}
                  detail={formatPlan(place.plannedFor!, place.plannedTime)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
