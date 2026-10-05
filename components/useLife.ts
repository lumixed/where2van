"use client";

import { useEffect, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_PIXEL } from "@/lib/mapStyle";
import { ROUTES, type LngLat, type Route } from "@/lib/transit";
import { useWorld, type Phase, type Weather } from "@/lib/world";

// Everything that moves on the map but is not a place: trains, ferries,
// seagulls, clouds, rain and snow. It is all painted on one small canvas
// laid over the map, at the map's own chunky pixel size, underneath the pins.

const INK = "#2a2238";
/** Frames a second. Pixel art does not need more, and it keeps phones cool. */
const FPS = 20;
/** Below this zoom the city is too small for trains and birds to read. */
const MIN_ZOOM = 10.5;

// ---- vehicles: trains and ferries that shuttle along a fixed route ----

interface Vehicle {
  route: Route;
  /** Distance from the start of the route to each point, in metres. */
  marks: number[];
  length: number;
  /** Metres a second. Faster than life, so there is something to watch. */
  speed: number;
  /** Seconds spent waiting at each end. */
  dwell: number;
  /** Where in its back-and-forth cycle it starts, 0 to 1. */
  start: number;
}

function metres(a: LngLat, b: LngLat) {
  const x = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180)) * 111_320;
  return Math.hypot(x, (b[1] - a[1]) * 110_540);
}

function vehicle(route: Route, speed: number, dwell: number, start: number): Vehicle {
  const marks = [0];
  for (let i = 1; i < route.path.length; i++) {
    marks.push(marks[i - 1] + metres(route.path[i - 1], route.path[i]));
  }
  return { route, marks, length: marks[marks.length - 1], speed, dwell, start };
}

const VEHICLES: Vehicle[] = ROUTES.flatMap((route) =>
  route.kind === "train"
    ? // Two trains a line, half a cycle apart, so they pass each other.
      [vehicle(route, 70, 6, 0), vehicle(route, 70, 6, 0.5)]
    : [vehicle(route, route.id === "seabus" ? 45 : 14, 8, 0)],
);

/** The point `distance` metres along a vehicle's route. */
function along(v: Vehicle, distance: number): LngLat {
  const d = Math.min(Math.max(distance, 0), v.length);
  let i = 1;
  while (i < v.marks.length - 1 && v.marks[i] < d) i++;
  const from = v.route.path[i - 1];
  const to = v.route.path[i];
  const t = (d - v.marks[i - 1]) / (v.marks[i] - v.marks[i - 1] || 1);
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

/** How far along its route a vehicle is at `seconds`, and which way it is heading. */
function progress(v: Vehicle, seconds: number): { distance: number; forward: boolean } {
  const trip = v.length / v.speed;
  const cycle = 2 * (trip + v.dwell);
  const t = (seconds / cycle + v.start) % 1 * cycle;
  if (t < trip) return { distance: t * v.speed, forward: true };
  if (t < trip + v.dwell) return { distance: v.length, forward: false };
  if (t < 2 * trip + v.dwell) return { distance: v.length - (t - trip - v.dwell) * v.speed, forward: false };
  return { distance: 0, forward: true };
}

// ---- things that live on the screen, not on the map ----

interface Drifter {
  x: number;
  y: number;
  /** Size or speed, depending on the kind. */
  size: number;
  seed: number;
}

function scatter(count: number, width: number, height: number): Drifter[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.6 + Math.random() * 0.8,
    seed: Math.random() * 100,
  }));
}

/** Short-lived puffs and sparkles, set off by tapping a landmark. */
interface Burst {
  at: LngLat;
  kind: "steam" | "sparkle";
  born: number;
}

const bursts: Burst[] = [];

/** Plays a small effect on the map at a place, for a couple of seconds. */
export function burst(at: LngLat, kind: Burst["kind"]) {
  bursts.push({ at, kind, born: performance.now() / 1000 });
}

const CLOUD_COLOR: Record<Phase, string> = {
  dawn: "rgb(255 226 208 / 0.82)",
  day: "rgb(255 255 255 / 0.82)",
  dusk: "rgb(255 214 196 / 0.82)",
  night: "rgb(58 70 104 / 0.78)",
};

function cloudCount(weather: Weather | null): number {
  if (!weather) return 0;
  if (weather.sky === "rain" || weather.sky === "snow" || weather.sky === "storm") return 6;
  if (weather.cloud > 0.8) return 6;
  if (weather.cloud > 0.5) return 4;
  return weather.cloud > 0.25 ? 2 : 0;
}

/**
 * Lays the canvas over the map and keeps it painted for as long as the map
 * is showing.
 */
export function useLife(mapRef: RefObject<MapLibreMap | null>) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const canvas = document.createElement("canvas");
    canvas.className = "life";
    const mapCanvas = map.getCanvas();
    // Straight after the map's own canvas: above the map, below every pin.
    mapCanvas.parentElement!.insertBefore(canvas, mapCanvas.nextSibling);
    const ctx = canvas.getContext("2d")!;

    let width = 0;
    let height = 0;
    let gulls: Drifter[] = [];
    let clouds: Drifter[] = [];
    let drops: Drifter[] = [];
    const resize = () => {
      const box = map.getContainer();
      width = canvas.width = Math.ceil(box.clientWidth / MAP_PIXEL);
      height = canvas.height = Math.ceil(box.clientHeight / MAP_PIXEL);
      gulls = scatter(4, width, height);
      clouds = scatter(6, width, height);
      drops = scatter(Math.round((width * height) / 260), width, height);
    };
    resize();
    map.on("resize", resize);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /** A geographic point in canvas pixels. */
    const spot = (at: LngLat) => {
      const p = map.project(at);
      return { x: Math.round(p.x / MAP_PIXEL), y: Math.round(p.y / MAP_PIXEL) };
    };
    const onScreen = (p: { x: number; y: number }, margin = 8) =>
      p.x > -margin && p.y > -margin && p.x < width + margin && p.y < height + margin;
    const box = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };

    function drawVehicles(now: number, zoom: number) {
      const metresPerPixel =
        ((78271.5 * Math.cos((map!.getCenter().lat * Math.PI) / 180)) / 2 ** zoom) * MAP_PIXEL;
      for (const v of VEHICLES) {
        const { distance, forward } = progress(v, now);
        if (v.route.kind === "boat") {
          const p = spot(along(v, distance));
          if (!onScreen(p)) continue;
          const small = v.route.id !== "seabus";
          const w = small ? 4 : 7;
          // A light wake trails behind while it is under way.
          if (distance > 0 && distance < v.length) {
            const behind = spot(along(v, distance + (forward ? -1 : 1) * metresPerPixel * (w - 1)));
            box(behind.x, behind.y, 2, 1, "rgb(255 255 255 / 0.7)");
          }
          box(p.x - (w >> 1), p.y - 2, w, 4, INK);
          box(p.x - (w >> 1) + 1, p.y - 1, w - 2, 1, "#ffffff");
          box(p.x - (w >> 1) + 1, p.y, w - 2, 1, v.route.color);
          continue;
        }
        // A train is three cars, each a small outlined block, strung along the track.
        for (let car = 0; car < 3; car++) {
          const back = car * 4.5 * metresPerPixel * (forward ? -1 : 1);
          const p = spot(along(v, distance + back));
          if (!onScreen(p)) continue;
          box(p.x - 2, p.y - 2, 4, 4, INK);
          box(p.x - 1, p.y - 1, 2, 2, car === 0 ? "#ffffff" : v.route.color);
        }
      }
    }

    function drawGulls(now: number) {
      for (const gull of gulls) {
        gull.x -= 0.35 * gull.size;
        if (gull.x < -6) {
          gull.x = width + 6;
          gull.y = Math.random() * height;
        }
        const x = gull.x;
        const y = gull.y + Math.sin(now * 1.5 + gull.seed) * 2;
        const up = Math.floor(now * 3 + gull.seed) % 2 === 0;
        // A soft shadow below sells the height.
        box(x + 1, y + 6, 3, 1, "rgb(42 34 56 / 0.18)");
        if (up) {
          box(x, y, 1, 1, "#ffffff");
          box(x + 4, y, 1, 1, "#ffffff");
          box(x + 1, y + 1, 3, 1, "#ffffff");
        } else {
          box(x + 1, y, 3, 1, "#ffffff");
          box(x, y + 1, 1, 1, "#ffffff");
          box(x + 4, y + 1, 1, 1, "#ffffff");
        }
        box(x + 2, y + (up ? 1 : 0), 1, 1, "#c9ced8");
      }
    }

    function drawClouds(now: number, count: number, phase: Phase, rainy: boolean) {
      const color = rainy && phase !== "night" ? "rgb(196 204 216 / 0.86)" : CLOUD_COLOR[phase];
      for (const cloud of clouds.slice(0, count)) {
        const w = Math.round(18 + cloud.size * 14);
        const span = width + w * 2;
        const x = still ? cloud.x : ((cloud.x + now * (1.2 + cloud.size)) % span) - w;
        const y = cloud.y;
        box(x + 3, y + 9, w, 4, "rgb(42 34 56 / 0.1)");
        box(x + w * 0.3, y, w * 0.38, 2, color);
        box(x + w * 0.12, y + 2, w * 0.76, 2, color);
        box(x, y + 4, w, 3, color);
      }
    }

    function drawWeather(now: number, weather: Weather, phase: Phase) {
      const { sky } = weather;
      if (sky === "fog") {
        box(0, 0, width, height, "rgb(255 255 255 / 0.3)");
        for (let band = 0; band < 3; band++) {
          const y = ((band * height) / 3 + (still ? 0 : now * 2)) % height;
          box(0, y, width, 5, "rgb(255 255 255 / 0.16)");
        }
        return;
      }
      if (still || (sky !== "rain" && sky !== "snow" && sky !== "storm")) return;
      const hard = sky === "storm" ? 1 : weather.intensity;
      const count = Math.round(drops.length * (0.25 + 0.75 * hard));
      const color =
        sky === "snow" ? "#ffffff" : phase === "night" ? "rgb(170 200 255 / 0.85)" : "rgb(47 111 181 / 0.75)";
      for (const drop of drops.slice(0, count)) {
        if (sky === "snow") {
          drop.y += 0.6 * drop.size;
          drop.x += Math.sin(now + drop.seed) * 0.3;
        } else {
          drop.y += 4.5 * drop.size;
          drop.x -= 1.2;
        }
        if (drop.y > height) {
          drop.y = -4;
          drop.x = Math.random() * (width + 20);
        }
        if (drop.x < -2) drop.x += width + 2;
        if (sky === "snow") box(drop.x, drop.y, drop.size > 1 ? 2 : 1, drop.size > 1 ? 2 : 1, color);
        else box(drop.x, drop.y, 1, 3, color);
      }
      // Lightning: the whole sky flickers for a frame or two, now and then.
      if (sky === "storm" && Math.floor(now * FPS) % (FPS * 7) < 2) {
        box(0, 0, width, height, "rgb(255 255 255 / 0.45)");
      }
    }

    function drawBursts(now: number) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        const age = now - b.born;
        if (age > 2) {
          bursts.splice(i, 1);
          continue;
        }
        const p = spot(b.at);
        for (let n = 0; n < 6; n++) {
          const t = age * 1.2 + n * 0.21;
          if (b.kind === "steam") {
            const size = 2 + Math.floor(t * 2);
            box(p.x - 1 + Math.sin(n * 2.1 + t * 3) * 3, p.y - 14 - t * 9 - n, size, size, `rgb(255 255 255 / ${0.85 - age * 0.4})`);
          } else if (Math.floor(now * 8 + n) % 2 === 0) {
            const angle = n * 1.05 + age;
            box(p.x + Math.cos(angle) * (6 + n), p.y - 7 + Math.sin(angle) * (6 + n), 1, 1, n % 2 ? "#fff6a8" : "#ffffff");
          }
        }
      }
    }

    let last = 0;
    let frame = requestAnimationFrame(function paint(stamp) {
      frame = requestAnimationFrame(paint);
      // Browsers stop these callbacks by themselves while the page is hidden.
      if (stamp - last < 1000 / FPS) return;
      last = stamp;
      const now = stamp / 1000;
      const { phase, weather } = useWorld.getState();
      const zoom = map.getZoom();
      ctx.clearRect(0, 0, width, height);

      if (!still && zoom >= MIN_ZOOM) {
        drawVehicles(now, zoom);
        if (phase !== "night") drawGulls(now);
      }
      drawBursts(now);
      const rainy = weather?.sky === "rain" || weather?.sky === "storm";
      drawClouds(now, cloudCount(weather), phase, rainy);
      if (weather) drawWeather(now, weather, phase);
    });

    return () => {
      cancelAnimationFrame(frame);
      map.off("resize", resize);
      canvas.remove();
    };
  }, [mapRef]);
}
