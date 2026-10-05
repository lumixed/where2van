import type { Category } from "./types";

// Photon is a free search service built on OpenStreetMap data. No key needed.
const BASE = "https://photon.komoot.io";
const VANCOUVER = { lat: 49.2827, lng: -123.1207 };
const METRO_BBOX = "-123.45,49.0,-122.3,49.5";

// OpenStreetMap's own labels for a place, sorted into our categories.
const EAT = new Set(["restaurant", "fast_food", "food_court", "deli"]);
const CAFE = new Set([
  "cafe",
  "bar",
  "pub",
  "ice_cream",
  "bakery",
  "biergarten",
  "confectionery",
  "pastry",
  "tea",
  "coffee",
]);
const SHOW = new Set([
  "theatre",
  "cinema",
  "nightclub",
  "music_venue",
  "arts_centre",
  "concert_hall",
  "stadium",
  "events_venue",
]);
const OUTDOORS = new Set([
  "park",
  "garden",
  "nature_reserve",
  "beach_resort",
  "viewpoint",
  "picnic_site",
  "dog_park",
]);

function guessCategory(key = "", value = ""): Category {
  if (EAT.has(value)) return "eat";
  if (CAFE.has(value)) return "cafe";
  if (SHOW.has(value)) return "concert";
  if (key === "shop") return "shop";
  if (key === "natural" || OUTDOORS.has(value)) return "outdoors";
  return "activity";
}

export interface GeoResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
  };
}

function toResult(f: PhotonFeature): GeoResult {
  const p = f.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const area = p.locality ?? p.district;
  const [lng, lat] = f.geometry.coordinates;
  return {
    id: `${p.osm_type ?? "x"}${p.osm_id ?? `${lat},${lng}`}`,
    name: p.name ?? (street || area || "Dropped pin"),
    address: [p.name ? street : "", area, p.city].filter(Boolean).join(", "),
    lat,
    lng,
    category: guessCategory(p.osm_key, p.osm_value),
  };
}

async function photon(path: string, signal?: AbortSignal) {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data: { features: PhotonFeature[] } = await res.json();
  return data.features.map(toResult);
}

export function searchPlaces(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    lat: String(VANCOUVER.lat),
    lon: String(VANCOUVER.lng),
    bbox: METRO_BBOX,
    limit: "7",
    lang: "en",
  });
  return photon(`/api/?${params}`, signal);
}

export async function reversePlace(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    lang: "en",
  });
  const results = await photon(`/reverse?${params}`, signal);
  return results[0] ?? null;
}
