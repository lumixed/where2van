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

- **Add places** by searching or dropping a pin, in seven categories: eat,
  café, activity, concert, outdoors, shopping and other.
- **To do and Done lists**, filterable by category.
- **Plan a date** for a to-do and see it on the calendar.
- **Mark a place as done** with the day you went, a star rating and a note.

## How it works

- **Map**: MapLibre GL, drawn at low resolution and scaled up so it looks like
  pixel art (`lib/mapStyle.ts`). Map data comes from OpenFreeMap and needs no
  account or key.
- **Pixel sprites**: the markers, icons and stars are small bitmaps in
  `lib/pixel.ts`.
- **Place search**: Photon, a free search service on OpenStreetMap data
  (`lib/geocode.ts`).
- **Shared data**: Supabase. Places live in one shared table
  (`supabase/schema.sql`). `lib/sync.ts` loads them when the app opens and
  listens for live changes; `lib/store.ts` sends every change. Without keys
  in `.env.local` the app still runs, keeping everything in the browser.
- **No sign-in**: anyone who has the website's link can see and change the
  map, so the link stays between the two of us.

## Setting up sync

1. In Supabase, open the SQL Editor, paste `supabase/schema.sql` and run it.
2. Copy the project URL and the publishable key into `.env.local`
   (see `.env.example`). Never the secret key.

## Roadmap

1. Put it online
2. A rating each, with her face; photos; "pick for us"
3. Landmarks and sound
