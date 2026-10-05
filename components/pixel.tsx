import { pinSvg, spritePath, SPRITES, starSvg, type SpriteName } from "@/lib/pixel";
import type { Category, Status } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** A 7×7 sprite. Sizes that are a multiple of 7px keep the pixels square. */
export function PixelIcon({
  name,
  className = "size-3.5",
}: {
  name: SpriteName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d={spritePath(SPRITES[name])} />
    </svg>
  );
}

/** The map marker's tile, for lists and cards. */
export function Tile({
  category,
  status,
  className,
}: {
  category: Category;
  status: Status;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("tile-art w-[39px] shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: pinSvg(category, status, false) }}
    />
  );
}

const STAR_ON = { __html: starSvg(true) };
const STAR_OFF = { __html: starSvg(false) };
const FIVE = [1, 2, 3, 4, 5];

/** A read-only rating, e.g. four gold stars and one empty. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className={cn("flex gap-0.5", className)}
    >
      {FIVE.map((n) => (
        <span
          key={n}
          className="tile-art w-[18px]"
          dangerouslySetInnerHTML={n <= rating ? STAR_ON : STAR_OFF}
        />
      ))}
    </span>
  );
}

/** Tap a star to rate; tap the same star again to clear the rating. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {FIVE.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          onClick={() => onChange(value === n ? null : n)}
          className="tile-art w-9 p-0.5 hover:scale-110"
          dangerouslySetInnerHTML={value !== null && n <= value ? STAR_ON : STAR_OFF}
        />
      ))}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("logo", className)}>
      Where<span className="text-heart">2</span>Van
    </span>
  );
}
