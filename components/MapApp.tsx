"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";
import { useUi } from "@/lib/ui";
import { BottomBar, PickBanner, Toast, TopBar } from "./Bars";
import MapView from "./MapView";
import PlaceCard from "./PlaceCard";
import PlaceForm from "./PlaceForm";
import PlacesPanel from "./PlacesPanel";

export default function MapApp() {
  const form = useUi((s) => s.form);
  const pickMode = useUi((s) => s.pickMode);

  useEffect(() => startSync(), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-grass">
      <MapView />
      <TopBar />
      <BottomBar />
      <PlacesPanel />
      <PlaceCard />
      {pickMode && <PickBanner />}
      {form && !pickMode && <PlaceForm form={form} />}
      <Toast />
    </main>
  );
}
