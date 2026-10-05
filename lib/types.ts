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

/** The two of us. Which one a device belongs to is chosen on that device. */
export type PersonId = "a" | "b";

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
  /**
   * The shared rating from before we each had our own: 1 to 5 stars, or
   * null. Kept so older memories still show their score.
   */
  rating: number | null;
  /** What each of us gave it, 1 to 5, or null when that person has not rated. */
  ratings: Record<PersonId, number | null>;
  review: string;
  /** Photos of the visit, as file paths in the shared photo storage. */
  photos: string[];
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
