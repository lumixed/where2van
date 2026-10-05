"use client";

import { PERSON_IDS, usePeople } from "@/lib/people";
import { photoUrl } from "@/lib/photos";
import { starSvg } from "@/lib/pixel";
import { disagree, visibleRating } from "@/lib/ratings";
import { useSync } from "@/lib/remote";
import type { Place } from "@/lib/types";
import { cn, Stars } from "./pixel";

const STAR_ON = { __html: starSvg("full") };
const STAR_OFF = { __html: starSvg("none") };
const FIVE = [1, 2, 3, 4, 5];

/** One of our faces from the rating scale. Stored tiny, so it shows as pixel art. */
export function Face({ path, className }: { path: string; className?: string }) {
  return (
    // A plain <img>: it comes straight from our own storage, already tiny.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl(path)} alt="" className={cn("face", className)} />
  );
}

/**
 * Tap a score to rate; tap it again to clear. Where the person has a face
 * for a score, the face stands in for that star.
 */
export function RatingPicker({
  value,
  onChange,
  faces,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  faces?: (string | null)[];
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1.5">
      {FIVE.map((n) => {
        const face = faces?.[n - 1];
        const chosen = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={`${n} out of 5`}
            onClick={() => onChange(chosen ? null : n)}
            className={cn(
              "w-11 hover:scale-110",
              face
                ? cn("p-0", value !== null && !chosen && "opacity-40")
                : "tile-art p-1",
            )}
            {...(face
              ? {}
              : { dangerouslySetInnerHTML: value !== null && n <= value ? STAR_ON : STAR_OFF })}
          >
            {face ? <Face path={face} className={chosen ? "outline-sky" : undefined} /> : undefined}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The ratings on a place we've been to: one line each once we rate on our
 * own, or the single shared rating from before that.
 */
export function RatingLines({ place }: { place: Place }) {
  const enabled = useSync((s) => s.people);
  const me = usePeople((s) => s.me);
  const people = usePeople((s) => s.people);
  const personal = place.ratings.a !== null || place.ratings.b !== null;
  if (!enabled || !personal) return <Stars rating={place.rating} />;

  return (
    <div className="space-y-1.5">
      {PERSON_IDS.map((id) => {
        const person = people[id];
        const seen = visibleRating(place, id, me);
        const face = typeof seen === "number" ? person.faces[seen - 1] : null;
        return (
          <div key={id} className="flex min-h-9 items-center gap-2">
            <span className="w-24 shrink-0 truncate text-sm font-semibold">{person.name}</span>
            {seen === null ? (
              <span className="text-sm text-mute">hasn&apos;t rated yet</span>
            ) : seen === "hidden" ? (
              <span className="text-sm text-mute">has rated. Add yours to see it.</span>
            ) : (
              <>
                {face && <Face path={face} className="w-9" />}
                <Stars rating={seen} />
              </>
            )}
          </div>
        );
      })}
      {disagree(place) && (
        <p className="text-sm font-semibold text-heart">You two disagree on this one!</p>
      )}
    </div>
  );
}
