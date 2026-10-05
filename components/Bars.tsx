"use client";

import { useEffect } from "react";
import { usePlaces } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { UNDO_MS } from "@/lib/undo";
import { formatClock, SKY_LABEL, useWorld, type Sky } from "@/lib/world";
import type { SpriteName } from "@/lib/pixel";
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

const SKY_ICON: Record<Sky, SpriteName> = {
  clear: "sun",
  cloudy: "cloud",
  fog: "fog",
  rain: "rain",
  snow: "snow",
  storm: "bolt",
};

/** Vancouver's weather right now, and on desktop the time there too. */
export function WeatherChip({ full }: { full?: boolean }) {
  const weather = useWorld((s) => s.weather);
  const night = useWorld((s) => s.phase === "night");
  const minutes = useWorld((s) => s.minutes);
  if (!weather) return null;
  const icon = weather.sky === "clear" && night ? "moon" : SKY_ICON[weather.sky];
  return (
    <p className="flex shrink-0 items-center gap-1.5 text-sm">
      {full && <span className="text-mute">Vancouver · {formatClock(minutes)} ·</span>}
      <PixelIcon name={icon} />
      <span className="sr-only">{SKY_LABEL[weather.sky]},</span>
      {full && <span aria-hidden>{SKY_LABEL[weather.sky]}</span>}
      {weather.temperature}°
    </p>
  );
}

/** Phone only: on desktop the side panel shows the same thing. */
export function TopBar() {
  const hasWeather = useWorld((s) => s.weather !== null);
  return (
    <>
      <header className="panel absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 px-3 py-2.5 md:hidden">
        <Logo className="text-xs" />
        <WeatherChip />
        <Tally />
      </header>
      {hasWeather && (
        <div className="panel absolute right-3 top-3 z-10 hidden px-3 py-1.5 md:block">
          <WeatherChip full />
        </div>
      )}
    </>
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
    // Long enough to reach for "Undo" when there is one.
    const timer = setTimeout(clearToast, toast.action ? UNDO_MS : 2400);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div
      key={toast.key}
      role="status"
      className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-3 md:left-[392px] md:top-6"
    >
      <div
        className={cn(
          "panel flex items-center gap-2 py-2 pl-4 font-semibold",
          toast.action ? "pop pointer-events-auto pr-2" : "toast pr-4",
        )}
      >
        <PixelIcon name="heart" className="size-3.5 text-heart" />
        {toast.text}
        {toast.action && (
          <button
            type="button"
            className="btn ml-2 py-1.5"
            onClick={() => {
              toast.action?.run();
              clearToast();
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/** "Badge earned!" It slides in, stays a few seconds, and opens the Badges tab when tapped. */
export function BadgeBanner() {
  const banner = useUi((s) => s.banner);
  const clearBanner = useUi((s) => s.clearBanner);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(clearBanner, 4500);
    return () => clearTimeout(timer);
  }, [banner, clearBanner]);

  if (!banner) return null;
  return (
    <div
      key={banner.key}
      className="pointer-events-none absolute inset-x-0 top-[22%] z-30 flex justify-center px-3 md:left-[392px]"
    >
      <button
        type="button"
        role="status"
        className="panel pop pointer-events-auto flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => {
          clearBanner();
          useUi.getState().openPanel("badges");
        }}
      >
        <span className="badge-shine grid size-12 shrink-0 place-items-center border-[3px] border-ink bg-want text-[#2a2238]">
          <PixelIcon name={banner.icon} className="size-[28px]" />
        </span>
        <span>
          <span className="block text-sm text-mute">{banner.title}</span>
          <span className="block text-lg font-bold leading-tight">{banner.text}</span>
        </span>
      </button>
    </div>
  );
}
