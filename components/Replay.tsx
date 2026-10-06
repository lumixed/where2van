"use client";

import { useEffect } from "react";
import { formatDay } from "@/lib/dates";
import { photoUrl } from "@/lib/photos";
import { useSync } from "@/lib/remote";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { PhotoStrip } from "./Photos";
import { cn, PixelIcon, Tile } from "./pixel";
import { RatingLines } from "./Ratings";

/** How long each memory stays up before the replay moves on. */
const SLIDE_MS = 5500;

/**
 * Plays our memories back in the order they happened: the map flies to each
 * place in turn (see MapView) while this card shows what we thought of it.
 */
export default function Replay() {
  const replay = useUi((s) => s.replay);
  const currentId = replay ? replay.ids[replay.index] : null;
  const playing = replay?.playing ?? false;
  const place = usePlaces((s) => s.places.find((p) => p.id === currentId));
  const showPhotos = useSync((s) => s.photos);
  const { stepReplay, toggleReplay, stopReplay } = useUi.getState();

  useEffect(() => {
    if (!currentId) return;
    // A memory that has been removed since the replay started is skipped.
    const wait = place ? (playing ? SLIDE_MS : null) : 0;
    if (wait === null) return;
    const timer = setTimeout(() => useUi.getState().stepReplay(1), wait);
    return () => clearTimeout(timer);
  }, [currentId, playing, place]);

  if (!replay || !place) return null;
  const cover = showPhotos ? place.photos[0] : undefined;

  return (
    <section
      aria-label="Replaying our memories"
      className={cn(
        "panel pop scroll-thin absolute z-20 max-h-[calc(100dvh-5.5rem)] overflow-y-auto p-4",
        "inset-x-3 bottom-3 mb-[env(safe-area-inset-bottom)]",
        "md:inset-x-auto md:bottom-4 md:left-[392px] md:w-[360px]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-mute" aria-live="polite">
          Memory {replay.index + 1} of {replay.ids.length}
        </p>
        <button type="button" className="btn px-2.5 py-2.5" onClick={stopReplay}>
          <PixelIcon name="close" />
          <span className="sr-only">Stop the replay</span>
        </button>
      </div>

      {/* Keyed by place, so each memory arrives with the same little pop. */}
      <div key={place.id} className="pop mt-2">
        {cover && (
          // A plain <img>: it comes straight from our own storage, already shrunk.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(cover)}
            alt=""
            className="mb-3 aspect-[4/3] w-full border-[3px] border-ink bg-shade object-cover"
          />
        )}
        <div className="flex items-center gap-3">
          <Tile category={place.category} status={place.status} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight">{place.name}</h2>
            <p className="text-sm text-mute">
              {place.doneAt ? formatDay(place.doneAt) : "Date not set"}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <RatingLines place={place} />
          {place.review && <p>{place.review}</p>}
        </div>
        {place.photos.length > 1 && (
          <PhotoStrip place={{ ...place, photos: place.photos.slice(1) }} />
        )}
      </div>

      <div className="mt-4 flex gap-1" aria-hidden>
        {replay.ids.map((id, i) => (
          <span
            key={id}
            className={cn("h-1.5 flex-1", i <= replay.index ? "bg-heart" : "bg-ink/20")}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn flex-1"
          disabled={replay.index === 0}
          onClick={() => stepReplay(-1)}
        >
          <PixelIcon name="left" />
          <span className="sr-only">Previous memory</span>
        </button>
        <button type="button" className="btn btn-want flex-[2]" onClick={toggleReplay}>
          <PixelIcon name={playing ? "pause" : "play"} />
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="btn flex-1" onClick={() => stepReplay(1)}>
          <PixelIcon name="right" />
          <span className="sr-only">Next memory</span>
        </button>
      </div>
    </section>
  );
}
