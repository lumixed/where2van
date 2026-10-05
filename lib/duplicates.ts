import { distanceKm } from "./geo";
import type { Place } from "./types";

/** Two entries this close are the same pin, whatever they are called. */
const SAME_PIN_KM = 0.01;
/** Two entries with the same name are the same place within a block or two. */
const SAME_NAME_KM = 0.2;

/** "Breka Bakery & Café" and "breka bakery cafe" should compare equal. */
function plain(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameName(a: string, b: string) {
  if (a === b) return a.length > 0;
  // "Kinton Ramen" and "Kinton Ramen Robson": one name inside the other.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.includes(short);
}

/** The place already on the map that `candidate` would duplicate, if any. */
export function findDuplicate(
  places: Place[],
  candidate: { name: string; lat: number; lng: number },
): Place | undefined {
  const name = plain(candidate.name);
  return places.find((place) => {
    const km = distanceKm(place, candidate);
    return km <= SAME_PIN_KM || (km <= SAME_NAME_KM && sameName(plain(place.name), name));
  });
}
