"use client";

import { badges, stats } from "@/lib/badges";
import { usePlaces } from "@/lib/store";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import { cn, PixelIcon } from "./pixel";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-sm text-mute">{label}</p>
    </div>
  );
}

/** How much of Vancouver we've covered, and the badges that go with it. */
export default function BadgesView() {
  const places = usePlaces((s) => s.places);
  const s = stats(places);
  const list = badges(places);
  const earned = list.filter((b) => b.have >= b.need).length;
  const visited = CATEGORIES.filter((c) => s.byCategory[c] > 0);

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div className="divider px-4 py-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={s.done} label="done" />
          <Stat value={s.average === null ? "–" : s.average.toFixed(1)} label="avg stars" />
          <Stat value={s.photos} label="photos" />
        </div>
        {visited.length > 0 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm">
            {visited.map((category) => (
              <li key={category} className="flex items-center gap-1.5">
                <PixelIcon name={category} />
                <span className="sr-only">{CATEGORY_LABEL[category]}:</span>
                {s.byCategory[category]}
              </li>
            ))}
          </ul>
        )}
        {s.areas.length > 0 && (
          <p className="mt-2 text-center text-sm text-mute">Been to {s.areas.join(", ")}</p>
        )}
      </div>

      <h3 className="bg-shade px-4 py-1.5 text-sm font-bold">
        Badges <span className="text-mute">{earned} of {list.length}</span>
      </h3>
      <ul className="grid grid-cols-2 gap-2 p-3">
        {list.map((badge) => {
          const done = badge.have >= badge.need;
          return (
            <li
              key={badge.id}
              className={cn("border-[3px] p-2.5", done ? "border-ink bg-white/60" : "border-ink/20")}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center border-[3px]",
                  done ? "border-ink bg-want" : "border-ink/25 bg-shade text-ink/35",
                )}
              >
                <PixelIcon name={badge.icon} className="size-[21px]" />
              </span>
              <p className="mt-2 font-bold leading-tight">{badge.name}</p>
              <p className="text-sm text-mute">{badge.hint}</p>
              {done ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <PixelIcon name="heart" className="size-3.5 text-heart" />
                  Earned
                </p>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 text-sm text-mute">
                  <span
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={badge.need}
                    aria-valuenow={badge.have}
                    aria-label={`${badge.name} progress`}
                    className="h-2.5 flex-1 border-2 border-ink/40"
                  >
                    <span
                      className="block h-full bg-want"
                      style={{ width: `${(badge.have / badge.need) * 100}%` }}
                    />
                  </span>
                  {badge.have}/{badge.need}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
