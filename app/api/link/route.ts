import { isMapsUrl, readMapsUrl, type LinkPlace } from "@/lib/mapsLink";

// Shared links are short ("maps.app.goo.gl/…") and only reveal the place
// after a few redirects, which a browser page is not allowed to follow on
// its own. This small server step follows them and reports what it found.
//
// Only the addresses themselves are read. Google's page is no help: when a
// link has no position, the page centres on wherever the visitor (here, our
// server) seems to be, which would put the place in the wrong city.

const MAX_HOPS = 6;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  "Accept-Language": "en",
};

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  let url: URL;
  try {
    url = new URL(new URL(request.url).searchParams.get("url") ?? "");
  } catch {
    return fail("not-a-link", 400);
  }

  let found: LinkPlace = { name: null, query: null, lat: null, lng: null };
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      // Every stop on the way has to be Google Maps: this must never become
      // a way to make our server fetch arbitrary addresses.
      if (!isMapsUrl(url)) return fail("not-maps", 400);
      const here = readMapsUrl(url);
      found = {
        name: here.name ?? found.name,
        query: here.query ?? found.query,
        lat: here.lat ?? found.lat,
        lng: here.lng ?? found.lng,
      };
      if (found.lat !== null) break;

      const response = await fetch(url, {
        redirect: "manual",
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      const next = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && next) {
        url = new URL(next, url);
        continue;
      }
      break;
    }
  } catch {
    return fail("unreachable", 502);
  }

  if (found.lat === null && !found.query) return fail("nothing-found", 404);
  return Response.json(found);
}
