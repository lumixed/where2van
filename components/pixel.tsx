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

const STAR = {
  full: { __html: starSvg("full") },
  half: { __html: starSvg("half") },
  none: { __html: starSvg("none") },
};
const FIVE = [1, 2, 3, 4, 5];

/**
 * A read-only rating out of five, such as four gold stars and one empty.
 * Averages can land on a half, which shows as a half-gold star. Renders
 * nothing when there is no rating to show.
 */
export function Stars({ rating, className }: { rating: number | null; className?: string }) {
  if (rating === null) return null;
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
          dangerouslySetInnerHTML={
            rating >= n ? STAR.full : rating >= n - 0.5 ? STAR.half : STAR.none
          }
        />
      ))}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("logo", className)}>
      Where<span className="text-heart">2</span>Van
    </span>
  );
}
