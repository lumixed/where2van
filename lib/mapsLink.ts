// Reading a place out of a Google Maps link, such as one shared from the app.

export interface LinkPlace {
  /** The place's name, when the link carries one. */
  name: string | null;
  /** The fuller text from the link (often name plus address), for searching. */
  query: string | null;
  lat: number | null;
  lng: number | null;
}

const GOOGLE_HOST = /^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/;
const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PAIR = new RegExp(`^\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*$`);

/** Whether a link is a Google Maps address we are willing to open or follow. */
export function isMapsUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return true;
  if (host === "goo.gl") return url.pathname.startsWith("/maps");
  if (!GOOGLE_HOST.test(host)) return false;
  return host.startsWith("maps.") || url.pathname.startsWith("/maps");
}

export function looksLikeMapsLink(text: string): boolean {
  try {
    return isMapsUrl(new URL(text.trim()));
  } catch {
    return false;
  }
}

function isPosition(lat: number, lng: number) {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function pair(lat: string, lng: string) {
  const a = Number(lat);
  const b = Number(lng);
  return isPosition(a, b) ? { lat: a, lng: b } : null;
}

/** What a Google Maps address says about the place, without loading the page. */
export function readMapsUrl(url: URL): LinkPlace {
  const href = decodeURIComponent(url.pathname) + url.search;

  // The place's own position ("!3d…!4d…") beats the map's centre ("@…,…").
  const exact = href.match(new RegExp(`!3d${NUMBER}!4d${NUMBER}`));
  const centre = href.match(new RegExp(`@${NUMBER},${NUMBER}`));
  const typed = [url.searchParams.get("q"), url.searchParams.get("query"), url.searchParams.get("ll")]
    .map((value) => value?.match(PAIR))
    .find(Boolean);
  const match = exact ?? typed ?? centre;
  const spot = match ? pair(match[1], match[2]) : null;

  // "/maps/place/Kinton+Ramen/…", or "?q=Kinton Ramen" when it is not a position.
  const inPath = url.pathname.match(/\/maps\/place\/([^/@]+)/)?.[1];
  const inQuery = [url.searchParams.get("q"), url.searchParams.get("query")].find(
    (value) => value && !PAIR.test(value),
  );
  const text = (inPath ? decodeURIComponent(inPath.replace(/\+/g, " ")) : inQuery)?.trim() || null;

  return {
    name: text ? text.split(",")[0].trim() : null,
    query: text,
    lat: spot?.lat ?? null,
    lng: spot?.lng ?? null,
  };
}
