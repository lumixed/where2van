# Where2Van

A map of Vancouver for the two of us: the places we want to eat at and
visit, and the ones we've been to. Drawn like a pixel-art game world.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What you can do

- **Add places** by searching, dropping a pin or pasting a Google Maps link,
  in seven categories: eat, café, activity, concert, outdoors, shopping and
  other. It warns you if the place is already on the map.
- **To do and Done lists**, filterable by category.
- **Plan a date** for a to-do and see it on the calendar.
- **Mark a place as done** with the day you went, a rating and a note.
- **A rating each**: each of us rates on our own phone. A lone rating stays
  hidden until the other one has rated too. Upload a face for each score and
  it replaces the stars.
- **Memories**: everything you've done, newest first, like a scrapbook.
- **Photos**: add pictures to a place you've been. They are shrunk before
  upload, so they stay small.
- **Badges and stats**: how many places, photos and neighbourhoods so far,
  with badges to earn along the way.
- **Reminders**: a heads-up for plans today and tomorrow, plans that slipped
  past, and the to-do that has waited longest.
- **A living map**: it follows Vancouver's real time of day (golden at sunrise
  and sunset, lit up at night) and its real weather (rain, snow, fog, clouds).
  The SeaBus and an Aquabus cross the water, and seagulls drift over. Two
  buttons by the zoom pin the look and mute sounds.
- **Little rewards**: marking a place done stamps its pin and sends up hearts,
  a banner announces each badge earned, and buttons blip (there is a mute
  button). Removing a place or a photo can be undone for a few seconds.
- **Tidy pins**: the first tap on a pin shows a small preview, the second opens
  it. Pins that would overlap merge into one numbered pin until you zoom in.
- **Pick for us**: can't decide? It picks a random to-do, by category or from
  the ones closest to you.

## How it works

- **Map**: MapLibre GL, drawn at low resolution and scaled up so it looks like
  pixel art (`lib/mapStyle.ts`). Map data comes from OpenFreeMap and needs no
  account or key.
- **Time and weather**: `lib/world.ts` keeps Vancouver's clock and reads the
  forecast from Open-Meteo (free, no key). The map's colours come from one of
  three palettes in `lib/mapStyle.ts`.
- **Moving things**: `components/useLife.ts` paints ferries, birds and weather
  on a small canvas over the map. The ferry routes in `lib/transit.ts` were
  traced from OpenStreetMap.
- **Pixel sprites**: the markers, icons and stars are small bitmaps in
  `lib/pixel.ts`.
- **Place search**: Photon, a free search service on OpenStreetMap data
  (`lib/geocode.ts`).
- **Links**: a pasted Google Maps link goes through `app/api/link`, a small
  server step that follows the short link's redirects and reads the place's
  name and position out of the address (`lib/mapsLink.ts`).
- **Shared data**: Supabase. Places live in one shared table
  (`supabase/schema.sql`). `lib/sync.ts` loads them when the app opens and
  listens for live changes; `lib/store.ts` sends every change. Without keys
  in `.env.local` the app still runs, keeping everything in the browser.
- **Photos**: Supabase Storage, in a public `photos` bucket (`lib/photos.ts`).
- **The two of us**: names and faces live in one shared `settings` row
  (`lib/people.ts`); which of us a device belongs to stays on that device.
- Photos and a rating each only switch on once the latest
  `supabase/schema.sql` has been run; until then the app works without them.
- **No sign-in**: anyone who has the website's link can see and change the
  map, so the link stays between the two of us.

## Setting up sync

1. In Supabase, open the SQL Editor, paste `supabase/schema.sql` and run it.
   Run it again whenever the file changes; it is safe to repeat.
2. Copy the project URL and the publishable key into `.env.local`
   (see `.env.example`). Never the secret key.

## Roadmap

1. Install as a phone app
2. Replay our memories, and the map filling in as we explore
