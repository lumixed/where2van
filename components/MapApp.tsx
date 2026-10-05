"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";
import { useUi } from "@/lib/ui";
import { BottomBar, PickBanner, Toast, TopBar } from "./Bars";
import MapView from "./MapView";
import PickForUs from "./PickForUs";
import PlaceCard from "./PlaceCard";
import PlaceForm from "./PlaceForm";
import PlacesPanel from "./PlacesPanel";
import Reminders from "./Reminders";

export default function MapApp() {
  const form = useUi((s) => s.form);
  const pickMode = useUi((s) => s.pickMode);
  const picker = useUi((s) => s.picker);

  useEffect(() => startSync(), []);

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
      <Toast />
    </main>
  );
}
