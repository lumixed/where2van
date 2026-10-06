"use client";

import { useState } from "react";
import type { SpriteName } from "@/lib/pixel";
import { Logo, PixelIcon } from "./pixel";

/** Set once someone has been through the tips on this device. */
const WELCOMED_KEY = "where2van:welcomed";

const TIPS: { icon: SpriteName; title: string; text: string }[] = [
  {
    icon: "plus",
    title: "Add the places you want to try",
    text: "Search by name, paste a Google Maps link, or press and hold the map.",
  },
  {
    icon: "heart",
    title: "Been there? Tap “We went here!”",
    text: "Rate it, add photos, and it becomes a memory you can look back on.",
  },
  {
    icon: "dice",
    title: "Can't decide where to go?",
    text: "Pick for us chooses one of your to-dos, and the calendar keeps your plans.",
  },
];

/** Three short tips, shown once, the first time the map is opened on a device. */
export default function Welcome() {
  const [step, setStep] = useState(() => (localStorage.getItem(WELCOMED_KEY) ? null : 0));
  if (step === null) return null;

  const finish = () => {
    localStorage.setItem(WELCOMED_KEY, "1");
    setStep(null);
  };
  const tip = TIPS[step];
  const last = step === TIPS.length - 1;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Where2Van"
        className="panel pop w-full max-w-sm p-5 text-center"
      >
        <Logo className="text-sm" />
        <span className="mx-auto mt-5 grid size-16 place-items-center border-[3px] border-ink bg-want text-[#2a2238]">
          <PixelIcon name={tip.icon} className="size-[35px]" />
        </span>
        <h2 className="mt-4 text-xl font-bold leading-tight">{tip.title}</h2>
        <p className="mx-auto mt-2 max-w-[28ch] text-mute">{tip.text}</p>

        <p className="mt-5 flex justify-center gap-2" aria-label={`Tip ${step + 1} of ${TIPS.length}`}>
          {TIPS.map((_, i) => (
            <span
              key={i}
              className={`size-2.5 border-2 border-ink ${i === step ? "bg-ink" : ""}`}
            />
          ))}
        </p>
        <div className="mt-4 flex gap-2">
          {!last && (
            <button type="button" className="btn px-4" onClick={finish}>
              Skip
            </button>
          )}
          <button
            type="button"
            autoFocus
            className="btn btn-want flex-1 py-3"
            onClick={() => (last ? finish() : setStep(step + 1))}
          >
            {last ? "Let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
