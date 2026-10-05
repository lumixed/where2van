"use client";

import { useEffect, type RefObject } from "react";
import { Marker, Popup, type Map as MapLibreMap } from "maplibre-gl";
import { findDuplicate } from "@/lib/duplicates";
import { COLORS, LANDMARKS, type Landmark } from "@/lib/landmarks";
import { paintedSvg } from "@/lib/pixel";
import { play } from "@/lib/sound";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { burst } from "./useLife";

/** Landmarks only appear once the city is big enough for them not to pile up. */
const MIN_ZOOM = 11.8;
/** Screen pixels per sprite pixel, the same as the pins. */
const SCALE = 3;

/** The speech bubble for a landmark: its name, a fact, and a way to add it. */
function bubble(landmark: Landmark, close: () => void): HTMLElement {
  const box = document.createElement("div");
  box.className = "landmark-bubble";
  const name = document.createElement("p");
  name.className = "landmark-name";
  name.textContent = landmark.name;
  const fact = document.createElement("p");
  fact.textContent = landmark.fact;

  // If it is already one of our places, offer to open that one.
  const ours = findDuplicate(usePlaces.getState().places, landmark);
  const action = document.createElement("button");
  action.type = "button";
  action.className = "btn btn-want";
  action.textContent = ours ? "Show it in our places" : "Add to our places";
  action.addEventListener("click", () => {
    close();
    const ui = useUi.getState();
    if (ours) {
      ui.select(ours.id);
      return;
    }
    ui.openAdd();
    ui.setDraft({
      name: landmark.name,
      address: "",
      lat: landmark.lat,
      lng: landmark.lng,
      category: landmark.category,
      note: "",
    });
  });

  box.append(name, fact, action);
  return box;
}

/** Puts Vancouver's landmarks on the map as little pixel buildings you can tap. */
export function useLandmarks(mapRef: RefObject<MapLibreMap | null>) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let popup: Popup | null = null;
    const close = () => {
      popup?.remove();
      popup = null;
    };

    const markers = LANDMARKS.map((landmark) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "landmark";
      el.style.width = `${landmark.sprite[0].length * SCALE}px`;
      el.setAttribute("aria-label", `${landmark.name}, a landmark`);
      el.innerHTML = `<span class="landmark-art">${paintedSvg(landmark.sprite, COLORS)}</span>`;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        const spot: [number, number] = [landmark.lng, landmark.lat];

        // A little hop, restarted on every tap.
        el.classList.remove("poked");
        void el.offsetWidth;
        el.classList.add("poked");

        if (landmark.effect === "steam") {
          burst(spot, "steam");
          play("toot");
        } else if (landmark.effect === "sparkle") {
          burst(spot, "sparkle");
          play("sparkle");
        } else {
          play(landmark.effect === "horn" ? "horn" : "tap");
        }

        close();
        popup = new Popup({
          offset: landmark.sprite.length * SCALE + 6,
          closeButton: false,
          maxWidth: "260px",
          className: "landmark-popup",
        })
          .setLngLat(spot)
          .setDOMContent(bubble(landmark, close))
          .addTo(map);
      });
      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat([landmark.lng, landmark.lat])
        .addTo(map);
    });

    const show = () => {
      const visible = map.getZoom() >= MIN_ZOOM;
      for (const marker of markers) marker.getElement().hidden = !visible;
      if (!visible) close();
    };
    show();
    map.on("zoom", show);

    return () => {
      map.off("zoom", show);
      close();
      for (const marker of markers) marker.remove();
    };
  }, [mapRef]);
}
