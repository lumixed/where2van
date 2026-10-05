import { distanceKm } from "./geo";
import type { CategoryFilter, Place } from "./types";

/** With "near us" on, the pick comes from this many of the closest to-dos. */
const NEAREST = 3;

/** The to-dos "Pick for us" may land on, given the chosen category and spot. */
export function candidates(
  places: Place[],
  category: CategoryFilter,
  here: { lat: number; lng: number } | null,
): Place[] {
  const todo = places.filter(
    (p) => p.status === "want" && (category === "all" || p.category === category),
  );
  if (!here) return todo;
  return todo.sort((a, b) => distanceKm(here, a) - distanceKm(here, b)).slice(0, NEAREST);
}

/** A random candidate: never `lastId` twice in a row, unless it is the only one. */
export function choose(pool: Place[], lastId?: string): Place | undefined {
  const others = pool.filter((p) => p.id !== lastId);
  const from = others.length > 0 ? others : pool;
  return from[Math.floor(Math.random() * from.length)];
}
