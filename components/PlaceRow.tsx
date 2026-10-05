"use client";

import { formatPlan } from "@/lib/dates";
import { overall } from "@/lib/ratings";
import { CATEGORY_LABEL, type Place } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { cn, PixelIcon, Stars, Tile } from "./pixel";

/** One place in a list. `detail` replaces the second line when given. */
export default function PlaceRow({ place, detail }: { place: Place; detail?: string }) {
  const selected = useUi((s) => s.selectedId === place.id);
  return (
    <button
      type="button"
      onClick={() => useUi.getState().select(place.id)}
      className={cn(
        "flex w-full items-center gap-3 border-[3px] px-2 py-2 text-left hover:bg-shade",
        selected ? "border-ink bg-shade" : "border-transparent",
      )}
    >
      <Tile category={place.category} status={place.status} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{place.name}</span>
        {detail ? (
          <span className="block truncate text-sm text-mute">{detail}</span>
        ) : place.status === "done" && overall(place) !== null ? (
          <Stars rating={overall(place)} className="mt-1" />
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-mute">
            {place.plannedFor && <PixelIcon name="calendar" className="size-3.5 text-sky" />}
            <span className="truncate">
              {place.plannedFor
                ? formatPlan(place.plannedFor, place.plannedTime)
                : place.note || place.address || CATEGORY_LABEL[place.category]}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
