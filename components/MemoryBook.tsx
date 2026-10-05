"use client";

import { formatDay, fromDayKey } from "@/lib/dates";
import { overall } from "@/lib/ratings";
import { usePlaces } from "@/lib/store";
import type { Place } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { PhotoStrip } from "./Photos";
import { cn, PixelIcon, Stars, Tile } from "./pixel";

interface Month {
  key: string;
  label: string;
  memories: Place[];
}

/** Groups memories, already sorted newest first, under "October 2026" headings. */
function byMonth(memories: Place[]): Month[] {
  const months: Month[] = [];
  for (const memory of memories) {
    const key = memory.doneAt?.slice(0, 7) ?? "";
    let month = months.at(-1);
    if (!month || month.key !== key) {
      month = {
        key,
        label: key
          ? fromDayKey(`${key}-01`).toLocaleDateString("en-CA", {
              month: "long",
              year: "numeric",
            })
          : "Sometime",
        memories: [],
      };
      months.push(month);
    }
    month.memories.push(memory);
  }
  return months;
}

/** Everything we've done, newest first: a scrapbook rather than a list. */
export default function MemoryBook() {
  const places = usePlaces((s) => s.places);
  const selectedId = useUi((s) => s.selectedId);
  const memories = places
    .filter((p) => p.status === "done")
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  const ratings = memories.flatMap((p) => overall(p) ?? []);
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  if (memories.length === 0) {
    return (
      <div className="min-h-0 flex-1 px-4 py-10 text-center">
        <PixelIcon name="heart" className="mx-auto size-[42px] text-heart" />
        <p className="mt-4 text-lg font-bold">No memories yet</p>
        <p className="mx-auto mt-1 max-w-[26ch] text-mute">
          When you&apos;ve been somewhere, open it and tap &ldquo;We went here!&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <p className="divider flex items-center gap-1.5 px-4 py-3">
        <PixelIcon name="heart" className="size-3.5 text-heart" />
        <span className="font-bold">
          {memories.length} {memories.length === 1 ? "memory" : "memories"}
        </span>
        {ratings.length > 0 && (
          <span className="text-mute">· {average.toFixed(1)} stars on average</span>
        )}
      </p>
      {byMonth(memories).map((month) => (
        <section key={month.key} aria-label={month.label}>
          <h3 className="sticky top-0 z-[1] bg-shade px-4 py-1.5 text-sm font-bold">
            {month.label}
          </h3>
          <ul className="space-y-2 p-2">
            {month.memories.map((memory) => (
              <li key={memory.id}>
                <button
                  type="button"
                  onClick={() => useUi.getState().select(memory.id)}
                  className={cn(
                    "block w-full border-[3px] bg-white/50 p-3 text-left hover:bg-shade",
                    memory.id === selectedId ? "border-ink bg-shade" : "border-ink/20",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Tile category={memory.category} status={memory.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{memory.name}</span>
                      <span className="block text-sm text-mute">
                        {memory.doneAt ? formatDay(memory.doneAt) : "Date not set"}
                      </span>
                    </span>
                  </span>
                  <Stars rating={overall(memory)} className="mt-2" />
                  {memory.review && <span className="mt-2 block">{memory.review}</span>}
                  <PhotoStrip place={memory} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
