"use client";

import { useEffect } from "react";
import { newlyDone, unannounced } from "@/lib/celebrate";
import { useSync } from "@/lib/remote";
import { play } from "@/lib/sound";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { burst } from "./useLife";

/** The badges this device has already made a fuss about. */
const ANNOUNCED_KEY = "where2van:badges-announced";

function readAnnounced(): Set<string> | null {
  try {
    const saved = localStorage.getItem(ANNOUNCED_KEY);
    return saved ? new Set(JSON.parse(saved) as string[]) : null;
  } catch {
    return null;
  }
}

/**
 * The little rewards: hearts and a fanfare when a place is marked as done
 * (by either of us), a banner when a badge is earned, and a blip on buttons.
 */
export function useCelebrations() {
  useEffect(() => {
    let announced = readAnnounced();
    const remember = (ids: Iterable<string>) => {
      announced = new Set([...(announced ?? []), ...ids]);
      localStorage.setItem(ANNOUNCED_KEY, JSON.stringify([...announced]));
    };

    // Badges earned before this device first looked are noted quietly, so
    // opening the map never sets off a parade of old news.
    const settle = () => {
      if (announced || useSync.getState().phase === "loading") return;
      remember(unannounced(usePlaces.getState().places, new Set()).map((b) => b.id));
    };
    settle();
    const stopSync = useSync.subscribe(settle);

    let queue: ReturnType<typeof unannounced> = [];
    let showing: ReturnType<typeof setTimeout> | undefined;
    const showNext = () => {
      const badge = queue.shift();
      if (!badge) {
        showing = undefined;
        return;
      }
      useUi.getState().showBanner({ title: "Badge earned!", text: badge.name, icon: badge.icon });
      play("badge");
      showing = setTimeout(showNext, 4800);
    };

    const stopPlaces = usePlaces.subscribe((state, before) => {
      if (state.places === before.places) return;
      const done = newlyDone(before.places, state.places);
      for (const place of done) burst([place.lng, place.lat]);
      if (done.length > 0) play("done");

      if (!announced) return;
      const earned = unannounced(state.places, announced);
      if (earned.length === 0) return;
      remember(earned.map((b) => b.id));
      queue.push(...earned);
      // Let the "done" fanfare finish before the badge takes its turn.
      if (!showing) showing = setTimeout(showNext, done.length > 0 ? 900 : 0);
    });

    const blip = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(".btn, .pin, .cluster")) play("tap");
    };
    document.addEventListener("click", blip);

    return () => {
      stopSync();
      stopPlaces();
      clearTimeout(showing);
      queue = [];
      document.removeEventListener("click", blip);
    };
  }, []);
}
