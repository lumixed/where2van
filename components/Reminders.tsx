"use client";

import { useState } from "react";
import { dayKey, formatDay, formatTime } from "@/lib/dates";
import { formatWait, reminders, type Reminder } from "@/lib/reminders";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { PixelIcon } from "./pixel";

/** Remembers the day the box was closed, so it stays away until tomorrow. */
const DISMISSED_KEY = "where2van:reminders-dismissed";

function Line({ item }: { item: Reminder }) {
  const { place } = item;
  const name = <span className="font-bold">{place.name}</span>;
  const time = place.plannedTime ? ` · ${formatTime(place.plannedTime)}` : "";
  switch (item.kind) {
    case "today":
      return <>Today: {name}{time}</>;
    case "tomorrow":
      return <>Tomorrow: {name}{time}</>;
    case "overdue":
      return <>Did you go to {name}? It was planned for {formatDay(place.plannedFor!)}.</>;
    case "waiting":
      return <>{name} has been waiting for {formatWait(item.days)}.</>;
  }
}

/** A small "heads up" box: plans coming up, plans that slipped, forgotten to-dos. */
export default function Reminders() {
  const places = usePlaces((s) => s.places);
  const busy = useUi((s) => Boolean(s.form || s.picker || s.pickMode));
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === dayKey(),
  );
  const items = reminders(places);
  if (dismissed || busy || items.length === 0) return null;

  return (
    <aside
      aria-label="Reminders"
      // On phones it stops short of the map buttons in the top-right corner.
      className="panel pop absolute left-3 right-16 top-[68px] z-10 md:left-[392px] md:right-auto md:top-4 md:w-[360px]"
    >
      <div className="flex items-center justify-between gap-2 pl-3 pr-2 pt-2">
        <p className="flex items-center gap-2 font-bold">
          <PixelIcon name="bell" className="size-3.5 text-heart" />
          Heads up
        </p>
        <button
          type="button"
          className="btn px-2 py-2"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, dayKey());
            setDismissed(true);
          }}
        >
          <PixelIcon name="close" />
          <span className="sr-only">Hide until tomorrow</span>
        </button>
      </div>
      <ul className="p-1.5">
        {items.map((item) => (
          <li key={`${item.kind}-${item.place.id}`}>
            <button
              type="button"
              onClick={() => useUi.getState().select(item.place.id)}
              className="block w-full px-2 py-1.5 text-left hover:bg-shade"
            >
              <Line item={item} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
