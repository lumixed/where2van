export const CATEGORIES = [
  "eat",
  "cafe",
  "activity",
  "concert",
  "outdoors",
  "shop",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** `want` = still to do, `done` = we went, so it is now a memory. */
export type Status = "want" | "done";

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  status: Status;
  note: string;
  createdAt: string;
  /** The day we plan to go, as a "YYYY-MM-DD" key, and an optional "HH:MM". */
  plannedFor: string | null;
  plannedTime: string;
  /** The day we went, as a "YYYY-MM-DD" key. */
  doneAt: string | null;
  /** 1 to 5 stars, or null when not rated. */
  rating: number | null;
  review: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  eat: "Eat",
  cafe: "Café",
  activity: "Activity",
  concert: "Concert",
  outdoors: "Outdoors",
  shop: "Shopping",
  other: "Other",
};

export const STATUS_LABEL: Record<Status, string> = {
  want: "To do",
  done: "Done",
};

export type StatusFilter = "all" | Status;
export type CategoryFilter = "all" | Category;

export function matchesFilter(
  place: Place,
  status: StatusFilter,
  category: CategoryFilter,
): boolean {
  return (
    (status === "all" || place.status === status) &&
    (category === "all" || place.category === category)
  );
}
