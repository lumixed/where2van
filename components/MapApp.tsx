"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";
import { useUi } from "@/lib/ui";
import { useWorld } from "@/lib/world";
import { BadgeBanner, BottomBar, PickBanner, Toast, TopBar } from "./Bars";
import MapView from "./MapView";
import PickForUs from "./PickForUs";
import PlaceCard from "./PlaceCard";
import PlaceForm from "./PlaceForm";
import PlacesPanel from "./PlacesPanel";
import Reminders from "./Reminders";
import { useCelebrations } from "./useCelebrations";
import UsSheet from "./UsSheet";
import Welcome from "./Welcome";

export default function MapApp() {
  const form = useUi((s) => s.form);
  const pickMode = useUi((s) => s.pickMode);
  const picker = useUi((s) => s.picker);
  const us = useUi((s) => s.us);

  useEffect(() => startSync(), []);
  useCelebrations();

  // The boxes around the map go dark with it at night.
  const night = useWorld((s) => s.phase === "night");
  useEffect(() => {
    document.documentElement.classList.toggle("night", night);
  }, [night]);

  // Keep Vancouver's clock and weather current while the map is open.
  useEffect(() => {
    const { tick, refresh } = useWorld.getState();
    void refresh();
    const clock = setInterval(tick, 60_000);
    const forecast = setInterval(refresh, 15 * 60_000);
    return () => {
      clearInterval(clock);
      clearInterval(forecast);
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-grass">
      <MapView />
      <TopBar />
      <BottomBar />
      <Reminders />
      <PlacesPanel />
      <PlaceCard />
      {pickMode && <PickBanner />}
      {form && !pickMode && <PlaceForm form={form} />}
      {picker && <PickForUs />}
      {us && <UsSheet />}
      <Toast />
      <BadgeBanner />
      <Welcome />
    </main>
  );
}
