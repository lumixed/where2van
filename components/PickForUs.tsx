"use client";

import { useEffect, useRef, useState } from "react";
import { distanceKm, formatDistance } from "@/lib/geo";
import { candidates, choose } from "@/lib/pick";
import { usePlaces } from "@/lib/store";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  type CategoryFilter,
  type Place,
} from "@/lib/types";
import { useUi } from "@/lib/ui";
import { PixelIcon, Tile } from "./pixel";
import Sheet from "./Sheet";

/** How long the names flick past before the pick lands. */
const SHUFFLE_MS = 700;

type Spot = { lat: number; lng: number };
type Locating = "off" | "asking" | "failed";

/** Can't decide? Picks one of the places still to do, at random. */
export default function PickForUs() {
  const places = usePlaces((s) => s.places);
  const { closePicker, select } = useUi.getState();
  const [category, setCategory] = useState<CategoryFilter>(() => useUi.getState().category);
  const [here, setHere] = useState<Spot | null>(null);
  const [locating, setLocating] = useState<Locating>("off");
  const [shown, setShown] = useState<Place | null>(null);
  const [rolling, setRolling] = useState(false);
  const shuffle = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(shuffle.current), []);

  const pool = candidates(places, category, here);

  function roll() {
    const choice = choose(pool, shown?.id);
    if (!choice) return;
    clearInterval(shuffle.current);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pool.length === 1 || still) {
      setShown(choice);
      return;
    }
    setRolling(true);
    const started = Date.now();
    shuffle.current = setInterval(() => {
      if (Date.now() - started < SHUFFLE_MS) {
        setShown(pool[Math.floor(Math.random() * pool.length)]);
        return;
      }
      clearInterval(shuffle.current);
      setShown(choice);
      setRolling(false);
    }, 90);
  }

  function chooseCategory(value: CategoryFilter) {
    setCategory(value);
    setShown(null);
  }

  function toggleNear() {
    setShown(null);
    if (here) {
      setHere(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocating("failed");
      return;
    }
    setLocating("asking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHere({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating("off");
      },
      () => setLocating("failed"),
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  return (
    <Sheet title="Pick for us" onClose={closePicker}>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          aria-pressed={category === "all"}
          onClick={() => chooseCategory("all")}
          className="btn chip"
        >
          <PixelIcon name="dice" />
          Anything
        </button>
        {CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => chooseCategory(value)}
            className="btn chip"
          >
            <PixelIcon name={value} />
            {CATEGORY_LABEL[value]}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={here !== null}
        onClick={toggleNear}
        disabled={locating === "asking"}
        className="btn mt-2 w-full"
      >
        <PixelIcon name="pin" />
        {locating === "asking" ? "Finding you…" : "Only places near us"}
      </button>
      {locating === "failed" && (
        <p role="alert" className="mt-1 text-sm text-heart">
          Couldn&apos;t get your location. Check that location is allowed for this site.
        </p>
      )}

      <div
        aria-live="polite"
        className="mt-3 flex min-h-[84px] items-center gap-3 border-[3px] border-dashed border-ink/25 bg-inset px-3 py-3"
      >
        {pool.length === 0 ? (
          <p className="text-mute">Nothing to do here yet. Add a place first.</p>
        ) : shown ? (
          <>
            <Tile category={shown.category} status={shown.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold leading-tight">{shown.name}</p>
              <p className="truncate text-sm text-mute">
                {here && !rolling && `${formatDistance(distanceKm(here, shown))} away · `}
                {shown.note || shown.address || CATEGORY_LABEL[shown.category]}
              </p>
            </div>
          </>
        ) : (
          <p className="text-mute">
            {pool.length} {pool.length === 1 ? "place" : "places"} to choose from.
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {shown && !rolling && (
          <button
            type="button"
            className="btn flex-1"
            onClick={() => {
              select(shown.id);
              closePicker();
            }}
          >
            Show on map
          </button>
        )}
        <button
          type="button"
          className="btn btn-want flex-1 py-3"
          disabled={pool.length === 0 || rolling}
          onClick={roll}
        >
          <PixelIcon name="dice" />
          {shown ? "Pick again" : "Pick!"}
        </button>
      </div>
    </Sheet>
  );
}
