"use client";

import { useRef, useState } from "react";
import { findDuplicate } from "@/lib/duplicates";
import { distanceKm } from "@/lib/geo";
import { reversePlace, searchPlaces, type GeoResult } from "@/lib/geocode";
import { looksLikeMapsLink, type LinkPlace } from "@/lib/mapsLink";
import { usePlaces, type PlaceInput } from "@/lib/store";
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL } from "@/lib/types";
import { useUi, type Form } from "@/lib/ui";
import { PixelIcon } from "./pixel";
import Sheet from "./Sheet";

export default function PlaceForm({ form }: { form: Form }) {
  const closeForm = useUi((s) => s.closeForm);
  const title =
    form.mode === "edit" ? "Edit place" : form.draft ? "About this place" : "Add a place";

  return (
    <Sheet title={title} onClose={closeForm}>
      {form.draft ? <Details form={form} draft={form.draft} /> : <Finder />}
    </Sheet>
  );
}

/** `link` and `link-error` are for a pasted Google Maps link instead of a search. */
type Phase = "idle" | "loading" | "done" | "error" | "link" | "link-error";

/** A search hit this close to a link's position is taken to be the same place. */
const SAME_PLACE_KM = 0.2;

function Finder() {
  const places = usePlaces((s) => s.places);
  const { setDraft, startPick } = useUi.getState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  /** Whether the results came from a pasted link and not from typing. */
  const [fromLink, setFromLink] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  function onQuery(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    request.current?.abort();
    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      setPhase("idle");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    if (looksLikeMapsLink(term)) {
      readLink(term, controller.signal);
      return;
    }
    setFromLink(false);
    setPhase("loading");
    timer.current = setTimeout(async () => {
      try {
        setResults(await searchPlaces(term, controller.signal));
        setPhase("done");
      } catch {
        if (!controller.signal.aborted) setPhase("error");
      }
    }, 280);
  }

  /** A pasted Google Maps link: fill in the place it points at. */
  async function readLink(link: string, signal: AbortSignal) {
    setResults([]);
    setPhase("link");
    try {
      const response = await fetch(`/api/link?url=${encodeURIComponent(link)}`, { signal });
      if (!response.ok) throw new Error("unreadable link");
      const found: LinkPlace = await response.json();
      const text = found.query ?? found.name;
      let hits = text ? await searchPlaces(text, signal).catch(() => []) : [];
      if (hits.length === 0 && found.name && found.name !== text) {
        hits = await searchPlaces(found.name, signal).catch(() => []);
      }

      if (found.lat !== null && found.lng !== null) {
        // The link says where; our own map data adds the address and type.
        const spot = { lat: found.lat, lng: found.lng };
        const known =
          hits.find((hit) => distanceKm(hit, spot) <= SAME_PLACE_KM) ??
          (await reversePlace(spot.lat, spot.lng, signal).catch(() => null));
        setDraft({
          name: found.name ?? known?.name ?? "Dropped pin",
          address: known?.address ?? "",
          ...spot,
          category: known?.category ?? "eat",
          note: "",
        });
        return;
      }

      // The link only names the place: show what our search finds for it.
      setQuery(found.name ?? "");
      setResults(hits);
      setFromLink(true);
      setPhase("done");
    } catch {
      if (!signal.aborted) setPhase("link-error");
    }
  }

  function choose(hit: GeoResult) {
    setDraft({
      name: hit.name,
      address: hit.address,
      lat: hit.lat,
      lng: hit.lng,
      category: hit.category,
      note: "",
    });
  }

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search for a place</span>
        <PixelIcon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mute"
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search, or paste a Google Maps link"
          className="field pl-9"
        />
      </label>

      <div className="scroll-thin mt-2 max-h-[38dvh] min-h-24 overflow-y-auto">
        {phase === "idle" && (
          <p className="px-1 py-3 text-mute">
            Search for the place by name, or paste a link shared from Google Maps.
          </p>
        )}
        {phase === "link" && <p className="blink px-1 py-3 font-semibold">Reading the link…</p>}
        {phase === "link-error" && (
          <p className="px-1 py-3 text-heart">
            Couldn&apos;t read that link. Try searching for the place by name.
          </p>
        )}
        {phase === "done" && fromLink && results.length > 0 && (
          <p className="px-1 pb-1 pt-2 text-sm text-mute">From your link. Pick the right one:</p>
        )}
        {phase === "loading" && results.length === 0 && (
          <p className="blink px-1 py-3 font-semibold">Searching…</p>
        )}
        {phase === "error" && (
          <p className="px-1 py-3 text-heart">
            Search isn&apos;t responding right now. You can still drop a pin on the map.
          </p>
        )}
        {phase === "done" && results.length === 0 && (
          <p className="px-1 py-3 text-mute">
            No match. Try another spelling, or drop a pin on the map.
          </p>
        )}
        <ul>
          {results.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => choose(hit)}
                className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-shade"
              >
                <PixelIcon name={hit.category} className="size-[21px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{hit.name}</span>
                  <span className="block truncate text-sm text-mute">{hit.address}</span>
                </span>
                {findDuplicate(places, hit) && (
                  <span className="shrink-0 text-sm font-semibold text-sky">On the map</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn mt-2 w-full" onClick={startPick}>
        <PixelIcon name="pin" />
        Drop a pin on the map instead
      </button>
    </div>
  );
}

function Details({ form, draft }: { form: Form; draft: PlaceInput }) {
  const { patchDraft, setDraft, closeForm, select, showToast } = useUi.getState();
  const { addPlace, updatePlace } = usePlaces.getState();
  const places = usePlaces((s) => s.places);
  const name = draft.name.trim();
  // Adding something that is already there is usually a slip, not a choice.
  const twin = form.mode === "add" ? findDuplicate(places, draft) : undefined;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    if (form.mode === "edit") {
      updatePlace(form.id, { name, category: draft.category, note: draft.note.trim() });
      closeForm();
      return;
    }
    const place = addPlace({ ...draft, name, note: draft.note.trim() });
    closeForm();
    select(place.id);
    showToast("Added to the map");
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Name</span>
        <input
          required
          value={draft.name}
          onChange={(e) => patchDraft({ name: e.target.value })}
          className="field"
        />
      </label>

      <div className="flex items-center gap-2 text-sm text-mute">
        <PixelIcon name="pin" />
        <span className="min-w-0 flex-1 truncate">
          {draft.address || `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`}
        </span>
        {form.mode === "add" && (
          <button
            type="button"
            className="font-semibold text-sky underline"
            onClick={() => setDraft(null)}
          >
            Change
          </button>
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Type</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={draft.category === value}
              onClick={() => patchDraft({ category: value })}
              className="btn chip"
            >
              <PixelIcon name={value} />
              {CATEGORY_LABEL[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Note</span>
        <textarea
          rows={2}
          value={draft.note}
          onChange={(e) => patchDraft({ note: e.target.value })}
          placeholder="Why do we want to go? What should we order?"
          className="field resize-none"
        />
      </label>

      {twin && (
        <div role="status" className="border-[3px] border-sky bg-inset px-3 py-2">
          <p>
            <span className="font-bold">{twin.name}</span> is already on the map, under{" "}
            {STATUS_LABEL[twin.status]}.
          </p>
          <button
            type="button"
            className="mt-1 font-semibold text-sky underline"
            onClick={() => {
              closeForm();
              select(twin.id);
            }}
          >
            Show me that one
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" className="btn px-5" onClick={closeForm}>
          Cancel
        </button>
        <button type="submit" className="btn btn-want flex-1 py-3" disabled={!name}>
          {form.mode === "edit" ? "Save changes" : twin ? "Add it anyway" : "Save to the map"}
        </button>
      </div>
    </form>
  );
}
