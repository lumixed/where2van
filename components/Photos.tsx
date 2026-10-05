"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_PHOTOS, photoUrl, uploadPhoto } from "@/lib/photos";
import { useSync } from "@/lib/remote";
import { usePlaces } from "@/lib/store";
import type { Place } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { removePhotoWithUndo } from "@/lib/undo";
import { PixelIcon } from "./pixel";

// Photos are plain <img> tags on purpose: they come straight from our own
// storage, already shrunk, so Next's image optimiser would add cost for nothing.
/* eslint-disable @next/next/no-img-element */

/** The photos of a visit on the place card: a grid you can add to and open. */
export default function Photos({ place }: { place: Place }) {
  const enabled = useSync((s) => s.photos);
  const [open, setOpen] = useState<number | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  if (!enabled) return null;

  const room = MAX_PHOTOS - place.photos.length;

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = [...files].slice(0, room);
    let failed = 0;
    for (const [i, file] of chosen.entries()) {
      setProgress(`Adding ${i + 1} of ${chosen.length}…`);
      try {
        const path = await uploadPhoto(place.id, file);
        usePlaces.getState().addPhoto(place.id, path);
      } catch (error) {
        console.error("Where2Van could not add a photo:", error);
        failed++;
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    const { showToast } = useUi.getState();
    if (failed > 0) {
      showToast(failed === 1 ? "A photo couldn't be added" : `${failed} photos couldn't be added`);
    } else if (files.length > chosen.length) {
      showToast(`A place holds up to ${MAX_PHOTOS} photos`);
    }
  }

  return (
    <div className="mt-3">
      {place.photos.length > 0 && (
        <ul className="mb-2 grid grid-cols-4 gap-1.5">
          {place.photos.map((path, i) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="block aspect-square w-full overflow-hidden border-[3px] border-ink bg-shade"
              >
                <img
                  src={photoUrl(path, true)}
                  alt={`Photo ${i + 1} of ${place.name}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => add(e.target.files)}
      />
      {room > 0 && (
        <button
          type="button"
          className="btn w-full"
          disabled={progress !== null}
          onClick={() => input.current?.click()}
        >
          <PixelIcon name="camera" />
          {progress ?? (place.photos.length > 0 ? "Add more photos" : "Add photos")}
        </button>
      )}

      {open !== null &&
        place.photos[open] &&
        createPortal(
          <Lightbox place={place} index={open} onIndex={setOpen} />,
          document.body,
        )}
    </div>
  );
}

/** One photo, full screen, with a way to flick through the rest or remove it. */
function Lightbox({
  place,
  index,
  onIndex,
}: {
  place: Place;
  index: number;
  onIndex: (index: number | null) => void;
}) {
  const path = place.photos[index];
  const count = place.photos.length;
  const step = (by: number) => onIndex((index + by + count) % count);

  function remove() {
    removePhotoWithUndo(place, path);
    // Stay on the neighbouring photo, or close when that was the last one.
    onIndex(count === 1 ? null : Math.min(index, count - 2));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}, ${place.name}`}
      className="fixed inset-0 z-50 flex flex-col gap-3 bg-ink/90 p-3 text-paper"
      onKeyDown={(e) => {
        if (e.key === "Escape") onIndex(null);
        if (e.key === "ArrowLeft" && count > 1) step(-1);
        if (e.key === "ArrowRight" && count > 1) step(1);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold">
          {place.name} · {index + 1} of {count}
        </p>
        <button type="button" autoFocus className="btn px-2.5 py-2.5" onClick={() => onIndex(null)}>
          <PixelIcon name="close" />
          <span className="sr-only">Close photo</span>
        </button>
      </div>

      <div className="grid min-h-0 flex-1 place-items-center" onClick={() => onIndex(null)}>
        <img
          src={photoUrl(path)}
          alt={`Photo ${index + 1} of ${place.name}`}
          className="max-h-full max-w-full border-[3px] border-paper object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        {count > 1 && (
          <button type="button" className="btn px-3 py-2.5" onClick={() => step(-1)}>
            <PixelIcon name="left" />
            <span className="sr-only">Previous photo</span>
          </button>
        )}
        <button type="button" className="btn" onClick={remove}>
          Remove photo
        </button>
        {count > 1 && (
          <button type="button" className="btn px-3 py-2.5" onClick={() => step(1)}>
            <PixelIcon name="right" />
            <span className="sr-only">Next photo</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** A few small previews, for the memory book. Not clickable on its own. */
export function PhotoStrip({ place, max = 4 }: { place: Place; max?: number }) {
  const enabled = useSync((s) => s.photos);
  if (!enabled || place.photos.length === 0) return null;
  const extra = place.photos.length - max;
  return (
    <span className="mt-2 flex gap-1.5">
      {place.photos.slice(0, max).map((path) => (
        <img
          key={path}
          src={photoUrl(path, true)}
          alt=""
          loading="lazy"
          className="size-14 border-[3px] border-ink bg-shade object-cover"
        />
      ))}
      {extra > 0 && (
        <span className="grid size-14 place-items-center border-[3px] border-ink/30 text-sm font-bold text-mute">
          +{extra}
        </span>
      )}
    </span>
  );
}
