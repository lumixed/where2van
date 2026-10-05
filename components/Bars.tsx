"use client";

import { useEffect } from "react";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { cn, Logo, PixelIcon } from "./pixel";

/** "4 to do · 2 done" */
export function Tally({ className }: { className?: string }) {
  const todo = usePlaces((s) => s.places.filter((p) => p.status === "want").length);
  const done = usePlaces((s) => s.places.length) - todo;
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-mute", className)}>
      <span>{todo} to do</span>
      <span aria-hidden>·</span>
      <PixelIcon name="heart" className="size-3.5 text-heart" />
      <span>{done} done</span>
    </p>
  );
}

/** Phone only: on desktop the side panel shows the same thing. */
export function TopBar() {
  return (
    <header className="panel absolute inset-x-3 top-3 z-10 flex items-center justify-between px-3 py-2.5 md:hidden">
      <Logo className="text-xs" />
      <Tally />
    </header>
  );
}

export function BottomBar() {
  const { openAdd, openPanel, openPicker } = useUi.getState();
  return (
    <nav className="absolute inset-x-3 bottom-3 z-10 grid grid-cols-4 gap-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <button type="button" className="btn chip py-2" onClick={() => openPanel("places")}>
        <PixelIcon name="list" />
        Places
      </button>
      <button type="button" className="btn chip py-2" onClick={() => openPanel("calendar")}>
        <PixelIcon name="calendar" />
        Calendar
      </button>
      <button type="button" className="btn chip py-2" onClick={openPicker}>
        <PixelIcon name="dice" />
        Pick
      </button>
      <button type="button" className="btn btn-want chip py-2" onClick={openAdd}>
        <PixelIcon name="plus" />
        Add
      </button>
    </nav>
  );
}

export function PickBanner() {
  const cancelPick = useUi((s) => s.cancelPick);
  return (
    <div className="panel pop absolute left-1/2 top-20 z-30 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 py-2 pl-4 pr-2 md:top-6">
      <p className="blink font-semibold">Tap the map to drop a pin</p>
      <button type="button" className="btn px-2.5 py-2.5" onClick={cancelPick}>
        <PixelIcon name="close" />
        <span className="sr-only">Cancel</span>
      </button>
    </div>
  );
}

export function Toast() {
  const toast = useUi((s) => s.toast);
  const clearToast = useUi((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 2400);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div
      key={toast.key}
      role="status"
      className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-3 md:left-[392px] md:top-6"
    >
      <p className="panel toast flex items-center gap-2 px-4 py-2.5 font-semibold">
        <PixelIcon name="heart" className="size-3.5 text-heart" />
        {toast.text}
      </p>
    </div>
  );
}
