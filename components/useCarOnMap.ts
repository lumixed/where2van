"use client";

import { useEffect, type RefObject } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { useCar, type LngLat } from "@/lib/car";
import { carSvg } from "@/lib/pixel";
import { usePlaces } from "@/lib/store";
import { matchesFilter } from "@/lib/types";
import { useUi } from "@/lib/ui";

/** Driving speed across the screen, so zooming out covers ground faster. */
const SPEED = 230;
/** "Drive there" never takes longer than this, however far the place is. */
const MAX_TRIP_SECONDS = 12;
/** How close, on screen, the car has to be to a place to stop at it. */
const NEAR = 64;
/** The zoom to drive at: close enough to see streets and buildings. */
const DRIVE_ZOOM = 15.5;

const KEYS: Record<string, [x: number, y: number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

function metersBetween(a: LngLat, b: LngLat) {
  const toRad = Math.PI / 180;
  const x = (b[0] - a[0]) * toRad * Math.cos(((a[1] + b[1]) / 2) * toRad);
  const y = (b[1] - a[1]) * toRad;
  return Math.hypot(x, y) * 6371000;
}

/** Compass direction of travel on screen, in the 8 ways the sprite can face. */
function facing(dx: number, dy: number) {
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.round(degrees / 45) * 45;
}

// Keeps the car clear of the side panel (desktop) or the place card (phone).
function followPadding() {
  if (window.matchMedia("(min-width: 768px)").matches) {
    return { left: 392, top: 0, right: 0, bottom: 0 };
  }
  return { left: 0, top: 60, right: 0, bottom: useUi.getState().selectedId ? 300 : 80 };
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("input, textarea, select") !== null;
}

/**
 * Puts the car on the map and runs it: steering from the keyboard or the
 * on-screen pad, automatic drives along a route, and the camera that follows.
 */
export function useCarOnMap(mapRef: RefObject<MapLibreMap | null>) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const saved = useCar.getState();
    let pos: LngLat = [saved.lng, saved.lat];
    let heading = saved.heading;

    const el = document.createElement("button");
    el.type = "button";
    el.className = "car";
    el.setAttribute("aria-label", "Our car. Press to drive.");
    el.innerHTML = `<span class="car-art">${carSvg()}</span>`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      useCar.getState().setDriving(true);
    });
    const art = el.firstElementChild as HTMLElement;
    art.style.rotate = `${heading}deg`;
    const marker = new Marker({ element: el, anchor: "center" }).setLngLat(pos).addTo(map);

    // --- Keyboard steering ---
    const held = new Set<string>();
    const steerFromKeys = () => {
      let x = 0;
      let y = 0;
      for (const key of held) {
        x += KEYS[key][0];
        y += KEYS[key][1];
      }
      useCar.getState().setSteer(Math.sign(x), Math.sign(y));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || useUi.getState().form || e.metaKey || e.ctrlKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in KEYS) {
        e.preventDefault();
        held.add(key);
        if (!useCar.getState().driving) useCar.getState().setDriving(true);
        steerFromKeys();
        return;
      }
      if (!useCar.getState().driving) return;
      // Leave Enter alone when a button has focus, so it isn't pressed twice.
      const onControl = e.target instanceof HTMLElement && e.target.closest("button, a");
      const { nearId, select } = useUi.getState();
      if (key === "Enter" && nearId && !onControl) select(nearId);
      if (key === "Escape") useCar.getState().setDriving(false);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (held.delete(key)) steerFromKeys();
    };
    const releaseKeys = () => {
      if (held.size === 0) return;
      held.clear();
      steerFromKeys();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseKeys);

    // Entering drive mode glides the camera over to the car and zooms in,
    // even if the car is already moving. After that it just follows.
    let arriving = useCar.getState().driving;
    const unsubscribe = useCar.subscribe((car, before) => {
      if (car.driving !== before.driving) arriving = car.driving;
    });

    // --- The loop ---
    let route: LngLat[] | null = null;
    let leg = 0;
    let routeSpeed = 0;
    let moving = false;
    let lastFrame = performance.now();
    let lastNearCheck = 0;
    let frame = requestAnimationFrame(function tick(now) {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      const car = useCar.getState();
      let moved = false;

      if (car.route !== route) {
        route = car.route;
        leg = 0;
        if (route) {
          arriving = true;
          const metersPerPixel =
            (78271.5 * Math.cos((pos[1] * Math.PI) / 180)) / 2 ** DRIVE_ZOOM;
          let length = 0;
          for (let i = 1; i < route.length; i++) length += metersBetween(route[i - 1], route[i]);
          routeSpeed = Math.max(SPEED * metersPerPixel, length / MAX_TRIP_SECONDS);
        }
      }

      if (route) {
        let budget = routeSpeed * dt;
        while (budget > 0 && leg < route.length - 1) {
          const next = route[leg + 1];
          const distance = metersBetween(pos, next);
          if (distance > 1) {
            const from = map.project(pos);
            const to = map.project(next);
            heading = facing(to.x - from.x, to.y - from.y);
          }
          if (distance <= budget) {
            pos = next;
            budget -= distance;
            leg++;
          } else {
            const t = budget / distance;
            pos = [pos[0] + (next[0] - pos[0]) * t, pos[1] + (next[1] - pos[1]) * t];
            budget = 0;
          }
        }
        moved = true;
        if (leg >= route.length - 1) {
          car.endRoute();
          useUi.getState().showToast("You've arrived");
        }
      } else if (car.steer.x || car.steer.y) {
        const length = Math.hypot(car.steer.x, car.steer.y);
        const point = map.project(pos);
        point.x += (car.steer.x / length) * SPEED * dt;
        point.y += (car.steer.y / length) * SPEED * dt;
        const bounds = map.getMaxBounds();
        const next = map.unproject(point);
        if (!bounds || bounds.contains(next)) pos = [next.lng, next.lat];
        heading = facing(car.steer.x, car.steer.y);
        moved = true;
      }

      if (moved) {
        marker.setLngLat(pos);
        art.style.rotate = `${heading}deg`;
      } else if (moving) {
        car.park(pos[0], pos[1], heading);
      }
      moving = moved;

      if (car.driving && arriving) {
        const ease = 1 - Math.exp(-dt * 7);
        const from = map.getCenter();
        const zoom = map.getZoom();
        const target = Math.max(zoom, DRIVE_ZOOM);
        map.jumpTo({
          center: [from.lng + (pos[0] - from.lng) * ease, from.lat + (pos[1] - from.lat) * ease],
          zoom: zoom + (target - zoom) * ease,
          padding: followPadding(),
        });
        const gap = map.project(pos).dist(map.project(map.getCenter()));
        if (gap < 2 && target - map.getZoom() < 0.02) arriving = false;
      } else if (car.driving && moved) {
        map.jumpTo({ center: pos, padding: followPadding() });
      }

      // A few times a second, see whether the car is next to a place.
      if (now - lastNearCheck > 200) {
        lastNearCheck = now;
        const ui = useUi.getState();
        let nearId: string | null = null;
        if (car.driving && !route) {
          const here = map.project(pos);
          let best = NEAR;
          for (const place of usePlaces.getState().places) {
            if (!matchesFilter(place, ui.status, ui.category)) continue;
            const distance = here.dist(map.project([place.lng, place.lat]));
            if (distance < best) {
              best = distance;
              nearId = place.id;
            }
          }
        }
        if (nearId !== ui.nearId) useUi.setState({ nearId });
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseKeys);
      marker.remove();
      useCar.getState().park(pos[0], pos[1], heading);
    };
  }, [mapRef]);
}
