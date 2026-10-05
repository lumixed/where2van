import type { SpriteName } from "./pixel";
import { overall } from "./ratings";
import type { Category, Place } from "./types";

export interface Badge {
  id: string;
  name: string;
  /** What it takes, in a few words. */
  hint: string;
  icon: SpriteName;
  have: number;
  need: number;
}

const STREET = /\d|\b(street|st|avenue|ave|road|rd|drive|dr|way|boulevard|blvd|highway|hwy|lane|place|crescent)\b/i;

/**
 * The neighbourhood, read out of an address like "420 Robson Street,
 * Yaletown, Vancouver". Returns null when the address has no such part.
 */
export function neighbourhood(place: Place): string | null {
  const parts = place.address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const area = parts[parts.length - 2];
  return STREET.test(area) ? null : area;
}

/** The categories that make up "one of everything"; "other" is not a kind of outing. */
const KINDS: Category[] = ["eat", "cafe", "activity", "concert", "outdoors", "shop"];

export interface Stats {
  done: number;
  todo: number;
  photos: number;
  /** Average of the rated memories, or null when none is rated. */
  average: number | null;
  areas: string[];
  byCategory: Record<Category, number>;
}

export function stats(places: Place[]): Stats {
  const memories = places.filter((p) => p.status === "done");
  const ratings = memories.flatMap((p) => overall(p) ?? []);
  const byCategory = { eat: 0, cafe: 0, activity: 0, concert: 0, outdoors: 0, shop: 0, other: 0 };
  for (const memory of memories) byCategory[memory.category]++;
  return {
    done: memories.length,
    todo: places.length - memories.length,
    photos: memories.reduce((n, p) => n + p.photos.length, 0),
    average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    areas: [...new Set(memories.flatMap((p) => neighbourhood(p) ?? []))].sort(),
    byCategory,
  };
}

/** Every badge with how far along we are; earned once `have >= need`. */
export function badges(places: Place[]): Badge[] {
  const s = stats(places);
  const memories = places.filter((p) => p.status === "done");
  const rated = memories.filter((p) => overall(p) !== null).length;
  const loved = memories.filter((p) => overall(p) === 5).length;
  const months = new Map<string, number>();
  for (const memory of memories) {
    const month = memory.doneAt?.slice(0, 7);
    if (month) months.set(month, (months.get(month) ?? 0) + 1);
  }
  const bestMonth = Math.max(0, ...months.values());

  return [
    { id: "first", name: "First memory", hint: "Go somewhere together", icon: "heart", have: s.done, need: 1 },
    { id: "five", name: "Getting around", hint: "5 places done", icon: "pin", have: s.done, need: 5 },
    { id: "fifteen", name: "Locals", hint: "15 places done", icon: "trophy", have: s.done, need: 15 },
    { id: "eat", name: "Foodies", hint: "Eat at 5 places", icon: "eat", have: s.byCategory.eat, need: 5 },
    { id: "cafe", name: "Café hoppers", hint: "Visit 3 cafés", icon: "cafe", have: s.byCategory.cafe, need: 3 },
    { id: "activity", name: "Up for anything", hint: "Do 3 activities", icon: "activity", have: s.byCategory.activity, need: 3 },
    { id: "concert", name: "Night out", hint: "See 3 shows", icon: "concert", have: s.byCategory.concert, need: 3 },
    { id: "outdoors", name: "Fresh air", hint: "3 outdoor trips", icon: "outdoors", have: s.byCategory.outdoors, need: 3 },
    { id: "shop", name: "Treat ourselves", hint: "3 shopping trips", icon: "shop", have: s.byCategory.shop, need: 3 },
    { id: "kinds", name: "All-rounders", hint: "One of every kind", icon: "dice", have: KINDS.filter((k) => s.byCategory[k] > 0).length, need: KINDS.length },
    { id: "areas", name: "Explorers", hint: "5 neighbourhoods", icon: "arrow", have: s.areas.length, need: 5 },
    { id: "month", name: "Big month", hint: "4 places in one month", icon: "calendar", have: bestMonth, need: 4 },
    { id: "loved", name: "Loved it", hint: "Give 5 stars", icon: "activity", have: loved, need: 1 },
    { id: "critics", name: "Critics", hint: "Rate 10 places", icon: "list", have: rated, need: 10 },
    { id: "photos", name: "Photographers", hint: "Add 10 photos", icon: "camera", have: s.photos, need: 10 },
  ];
}
