"use client";

import { useRef, useState } from "react";
import { PERSON_IDS, usePeople } from "@/lib/people";
import { deletePhotos, uploadFace } from "@/lib/photos";
import type { PersonId } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { Face } from "./Ratings";
import Sheet from "./Sheet";

const FIVE = [1, 2, 3, 4, 5];

/** Our names, which of us this device belongs to, and the faces we rate with. */
export default function UsSheet() {
  return (
    <Sheet title="The two of us" onClose={useUi.getState().closeUs}>
      <p className="text-sm text-mute">
        Add a face for each score and it replaces the stars when that person rates: 1 for
        &ldquo;never again&rdquo;, 5 for &ldquo;loved it&rdquo;.
      </p>
      <div className="mt-3 space-y-3">
        {PERSON_IDS.map((id) => (
          <PersonBox key={id} id={id} />
        ))}
      </div>
    </Sheet>
  );
}

function PersonBox({ id }: { id: PersonId }) {
  const person = usePeople((s) => s.people[id]);
  const isMe = usePeople((s) => s.me === id);
  const { setMe, rename, setFace } = usePeople.getState();
  const input = useRef<HTMLInputElement>(null);
  /** The score whose face is being picked or uploaded right now. */
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || score === null) return;
    setBusy(true);
    try {
      const old = person.faces[score - 1];
      setFace(id, score, await uploadFace(file));
      if (old) deletePhotos([old]);
    } catch (error) {
      console.error("Where2Van could not save a face:", error);
      useUi.getState().showToast("That picture couldn't be added");
    }
    setBusy(false);
    setScore(null);
    if (input.current) input.current.value = "";
  }

  return (
    <fieldset className="border-[3px] border-ink/25 p-3">
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-semibold">Name</span>
          <input
            // Re-made when the shared name changes, so a rename on the other phone shows up.
            key={person.name}
            defaultValue={person.name}
            maxLength={20}
            onBlur={(e) => e.target.value.trim() !== person.name && rename(id, e.target.value)}
            className="field"
          />
        </label>
        <button type="button" aria-pressed={isMe} className="btn" onClick={() => setMe(id)}>
          {isMe ? "This is me" : "I'm this one"}
        </button>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <ul className="mt-3 grid grid-cols-5 gap-2">
        {FIVE.map((n) => {
          const face = person.faces[n - 1];
          return (
            <li key={n} className="text-center">
              <button
                type="button"
                disabled={busy}
                aria-label={`${face ? "Change" : "Add"} ${person.name}'s face for ${n} out of 5`}
                onClick={() => {
                  setScore(n);
                  input.current?.click();
                }}
                className="grid aspect-square w-full place-items-center border-[3px] border-dashed border-ink/40 bg-inset text-xl font-bold text-mute hover:bg-shade"
              >
                {busy && score === n ? "…" : face ? <Face path={face} className="border-0" /> : "+"}
              </button>
              <span className="text-sm text-mute">{n}</span>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
