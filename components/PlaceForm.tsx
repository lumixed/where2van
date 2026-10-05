"use client";

import { useRef, useState } from "react";
import { searchPlaces, type GeoResult } from "@/lib/geocode";
import { usePlaces, type PlaceInput } from "@/lib/store";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
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

type Phase = "idle" | "loading" | "done" | "error";

function Finder() {
  const { setDraft, startPick } = useUi.getState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
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
    setPhase("loading");
    const controller = new AbortController();
    request.current = controller;
    timer.current = setTimeout(async () => {
      try {
        setResults(await searchPlaces(term, controller.signal));
        setPhase("done");
      } catch {
        if (!controller.signal.aborted) setPhase("error");
      }
    }, 280);
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
          placeholder="Restaurant, venue, park, anything…"
          className="field pl-9"
        />
      </label>

      <div className="scroll-thin mt-2 max-h-[38dvh] min-h-24 overflow-y-auto">
        {phase === "idle" && (
          <p className="px-1 py-3 text-mute">Search for the place by name.</p>
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
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{hit.name}</span>
                  <span className="block truncate text-sm text-mute">{hit.address}</span>
                </span>
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
  const name = draft.name.trim();

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

      <div className="flex gap-2">
        <button type="button" className="btn px-5" onClick={closeForm}>
          Cancel
        </button>
        <button type="submit" className="btn btn-want flex-1 py-3" disabled={!name}>
          {form.mode === "edit" ? "Save changes" : "Save to the map"}
        </button>
      </div>
    </form>
  );
}
