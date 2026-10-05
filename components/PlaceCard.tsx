"use client";

import { useState } from "react";
import { useCar } from "@/lib/car";
import { dayKey, formatDay, formatPlan } from "@/lib/dates";
import { usePlaces } from "@/lib/store";
import { CATEGORY_LABEL, STATUS_LABEL, type Place } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { cn, PixelIcon, StarPicker, Stars, Tile } from "./pixel";

function mapsLink(place: Place) {
  const query = place.address
    ? `${place.name}, ${place.address}`
    : `${place.lat},${place.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** What the card is showing below the place's name. */
type Mode = "view" | "memory" | "plan" | "remove";

export default function PlaceCard() {
  const selectedId = useUi((s) => s.selectedId);
  const place = usePlaces((s) => s.places.find((p) => p.id === selectedId));
  if (!place) return null;
  return <Card key={place.id} place={place} />;
}

function Card({ place }: { place: Place }) {
  const [mode, setMode] = useState<Mode>("view");
  const { select } = useUi.getState();
  const back = () => setMode("view");

  return (
    <section
      aria-label={place.name}
      className={cn(
        "panel pop scroll-thin absolute z-20 max-h-[calc(100dvh-5.5rem)] overflow-y-auto p-4",
        "inset-x-3 bottom-3 mb-[env(safe-area-inset-bottom)]",
        "md:inset-x-auto md:bottom-4 md:left-[392px] md:w-[360px]",
      )}
    >
      <div className="flex items-start gap-3">
        <Tile category={place.category} status={place.status} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-mute">
            {CATEGORY_LABEL[place.category]} · {STATUS_LABEL[place.status]}
          </p>
          <h2 className="text-xl font-bold leading-tight">{place.name}</h2>
          {place.address && <p className="mt-0.5 text-sm text-mute">{place.address}</p>}
        </div>
        <button type="button" className="btn px-2.5 py-2.5" onClick={() => select(null)}>
          <PixelIcon name="close" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      {mode === "view" && <Details place={place} setMode={setMode} />}
      {mode === "memory" && <MemoryForm place={place} onClose={back} />}
      {mode === "plan" && <PlanForm place={place} onClose={back} />}
      {mode === "remove" && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 font-semibold">Remove it from the map?</p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              usePlaces.getState().removePlace(place.id);
              select(null);
            }}
          >
            Remove
          </button>
          <button type="button" className="btn" onClick={back}>
            Keep
          </button>
        </div>
      )}
    </section>
  );
}

function Details({ place, setMode }: { place: Place; setMode: (mode: Mode) => void }) {
  const done = place.status === "done";
  const overdue = !done && place.plannedFor !== null && place.plannedFor < dayKey();

  return (
    <>
      {place.note && (
        <p className="mt-3 border-[3px] border-dashed border-ink/25 bg-white/60 px-3 py-2">
          {place.note}
        </p>
      )}

      {done ? (
        <div className="mt-3 space-y-1.5">
          {place.rating && <Stars rating={place.rating} />}
          {place.review && <p>{place.review}</p>}
          {place.doneAt && (
            <p className="flex items-center gap-1.5 text-sm text-mute">
              <PixelIcon name="heart" className="size-3.5 text-heart" />
              We went on {formatDay(place.doneAt)}
            </p>
          )}
        </div>
      ) : place.plannedFor ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
          <PixelIcon name="calendar" className="size-3.5 text-sky" />
          {overdue ? "Was planned for " : "Planned for "}
          {formatPlan(place.plannedFor, place.plannedTime)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-mute">
          Added {formatDay(dayKey(new Date(place.createdAt)))}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {!done && (
          <button
            type="button"
            className="btn btn-been w-full py-3"
            onClick={() => setMode("memory")}
          >
            <PixelIcon name="heart" />
            We went here!
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn flex-1"
            onClick={() => useCar.getState().driveTo(place)}
          >
            <PixelIcon name="car" />
            Drive there
          </button>
          {done ? (
            <button type="button" className="btn flex-1" onClick={() => setMode("memory")}>
              <PixelIcon name="activity" />
              {place.rating ? "Edit rating" : "Rate it"}
            </button>
          ) : (
            <button type="button" className="btn flex-1" onClick={() => setMode("plan")}>
              <PixelIcon name="calendar" />
              {place.plannedFor ? "Change date" : "Plan a date"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <a className="btn flex-1" href={mapsLink(place)} target="_blank" rel="noreferrer">
            <PixelIcon name="arrow" />
            Maps
          </a>
          <button
            type="button"
            className="btn flex-1"
            onClick={() => useUi.getState().openEdit(place)}
          >
            Edit
          </button>
          <button type="button" className="btn flex-1" onClick={() => setMode("remove")}>
            Remove
          </button>
        </div>
      </div>
    </>
  );
}

/** "How was it?": the day we went, a star rating and a few words. */
function MemoryForm({ place, onClose }: { place: Place; onClose: () => void }) {
  const today = dayKey();
  const planned = place.plannedFor && place.plannedFor <= today ? place.plannedFor : null;
  const [date, setDate] = useState(place.doneAt ?? planned ?? today);
  const [rating, setRating] = useState(place.rating);
  const [review, setReview] = useState(place.review);
  const done = place.status === "done";

  function save(e: React.FormEvent) {
    e.preventDefault();
    usePlaces.getState().saveMemory(place.id, { date, rating, review: review.trim() });
    if (!done) useUi.getState().showToast("Saved as a memory");
    onClose();
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      <div>
        <p className="mb-1 text-sm font-semibold">How was it?</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">When did we go?</span>
        <input
          type="date"
          required
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">What do we remember?</span>
        <textarea
          rows={2}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="What we ordered, what was fun, would we go again?"
          className="field resize-none"
        />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn px-4" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-been flex-1 py-3">
          {done ? "Save" : "Save memory"}
        </button>
      </div>
      {done && (
        <button
          type="button"
          className="w-full text-center text-sm text-mute underline"
          onClick={() => {
            usePlaces.getState().moveToTodo(place.id);
            onClose();
          }}
        >
          We haven&apos;t been yet: move back to to do
        </button>
      )}
    </form>
  );
}

function PlanForm({ place, onClose }: { place: Place; onClose: () => void }) {
  const [date, setDate] = useState(place.plannedFor ?? dayKey());
  const [time, setTime] = useState(place.plannedTime);
  const { planVisit } = usePlaces.getState();

  function save(e: React.FormEvent) {
    e.preventDefault();
    planVisit(place.id, date, time);
    useUi.getState().showToast(`Planned for ${formatDay(date)}`);
    onClose();
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Day</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Time (optional)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn px-4" onClick={onClose}>
          Cancel
        </button>
        {place.plannedFor && (
          <button
            type="button"
            className="btn px-4"
            onClick={() => {
              planVisit(place.id, null, "");
              onClose();
            }}
          >
            Unplan
          </button>
        )}
        <button type="submit" className="btn btn-want flex-1 py-3">
          Save plan
        </button>
      </div>
    </form>
  );
}
