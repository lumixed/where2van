import type { PersonId, Place } from "./types";

// Each of us rates on our own. A single rating stays hidden from the other
// person until they have rated too, so nobody is swayed by the first score.

/** Both of us have rated, so the scores are out in the open. */
export function revealed(place: Place): boolean {
  return place.ratings.a !== null && place.ratings.b !== null;
}

/**
 * The one score to show in lists and averages: the mean of our two ratings
 * once both are in, or the older shared rating from before there were two.
 * Null while only one of us has rated, since that score is still secret.
 */
export function overall(place: Place): number | null {
  const { a, b } = place.ratings;
  if (a !== null && b !== null) return (a + b) / 2;
  if (a !== null || b !== null) return null;
  return place.rating;
}

/**
 * What `viewer` gets to see of `person`'s rating: the score, "hidden" when
 * it exists but is still secret, or null when they have not rated.
 */
export function visibleRating(
  place: Place,
  person: PersonId,
  viewer: PersonId | null,
): number | "hidden" | null {
  const score = place.ratings[person];
  if (score === null) return null;
  return revealed(place) || viewer === person ? score : "hidden";
}

/** Two or more stars apart: worth pointing out. */
export function disagree(place: Place): boolean {
  const { a, b } = place.ratings;
  return a !== null && b !== null && Math.abs(a - b) >= 2;
}
