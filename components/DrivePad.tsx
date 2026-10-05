"use client";

import { useCar } from "@/lib/car";
import type { SpriteName } from "@/lib/pixel";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { cn, PixelIcon } from "./pixel";

const ARROWS: { name: SpriteName; label: string; x: number; y: number; cell: string }[] = [
  { name: "up", label: "Drive up", x: 0, y: -1, cell: "col-start-2 row-start-1" },
  { name: "left", label: "Drive left", x: -1, y: 0, cell: "col-start-1 row-start-2" },
  { name: "right", label: "Drive right", x: 1, y: 0, cell: "col-start-3 row-start-2" },
  { name: "down", label: "Drive down", x: 0, y: 1, cell: "col-start-2 row-start-3" },
];

/** The Drive button, which turns into a steering pad while driving. */
export default function DrivePad() {
  const driving = useCar((s) => s.driving);
  const { setDriving, setSteer } = useCar.getState();
  // On phones the bottom of the screen is taken while a card or sheet is open.
  const covered = useUi((s) => Boolean(s.selectedId || s.form || s.panelOpen));

  // Desktop: left of the zoom buttons, above the map credits.
  const place = cn(
    "absolute bottom-[76px] right-3 z-10 md:bottom-10 md:right-16",
    covered && "max-md:hidden",
  );

  if (!driving) {
    return (
      <button type="button" className={cn("btn", place)} onClick={() => setDriving(true)}>
        <PixelIcon name="car" />
        Drive
      </button>
    );
  }

  const release = () => setSteer(0, 0);
  return (
    <div className={place}>
      <p className="panel mb-2 hidden px-2 py-1 text-center text-sm md:block">
        Arrow keys or WASD
      </p>
      <div
        className="grid touch-none select-none grid-cols-3 grid-rows-3 gap-1"
        onContextMenu={(e) => e.preventDefault()}
      >
        {ARROWS.map((arrow) => (
          <button
            key={arrow.name}
            type="button"
            aria-label={arrow.label}
            className={cn("btn size-12 p-0", arrow.cell)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setSteer(arrow.x, arrow.y);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
          >
            <PixelIcon name={arrow.name} className="size-[21px]" />
          </button>
        ))}
        <button
          type="button"
          className="btn btn-danger col-start-2 row-start-2 size-12 p-0"
          onClick={() => setDriving(false)}
        >
          <PixelIcon name="close" />
          <span className="sr-only">Stop driving</span>
        </button>
      </div>
    </div>
  );
}

/** Shown while driving next to a place: one tap (or Enter) opens it. */
export function NearPrompt() {
  const nearId = useUi((s) => s.nearId);
  const selectedId = useUi((s) => s.selectedId);
  const place = usePlaces((s) => s.places.find((p) => p.id === nearId));
  if (!place || place.id === selectedId) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-3 md:left-[392px] md:top-6">
      <button
        type="button"
        className="btn btn-want pop pointer-events-auto max-w-full"
        onClick={() => useUi.getState().select(place.id)}
      >
        <PixelIcon name="pin" />
        <span className="truncate">Stop at {place.name}</span>
        <span className="hidden text-sm font-normal md:inline">· Enter</span>
      </button>
    </div>
  );
}
