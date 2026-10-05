"use client";

import dynamic from "next/dynamic";

// The app reads saved places from the browser and draws a WebGL map, so it
// only ever renders on the client.
const MapApp = dynamic(() => import("./MapApp"), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-grass">
      <p className="logo blink text-sm">Loading map…</p>
    </div>
  ),
});

export default function AppLoader() {
  return <MapApp />;
}
