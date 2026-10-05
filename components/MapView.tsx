"use client";

import { useEffect, useRef } from "react";
import {
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_PIXEL, pixelStyle } from "@/lib/mapStyle";
import { pinSvg } from "@/lib/pixel";
import { usePlaces } from "@/lib/store";
import { matchesFilter, STATUS_LABEL, type Place } from "@/lib/types";
import { useUi } from "@/lib/ui";

// The worker file is copied into /public by the `copy:map-worker` script,
// because the bundler cannot find it next to the library on its own.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const VANCOUVER: [number, number] = [-123.1207, 49.2727];

function buildPin(onClick: () => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "pin";
  el.innerHTML = '<span class="pin-art"></span>';
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

function paintPin(el: HTMLElement, place: Place, selected: boolean, visible: boolean) {
  el.dataset.status = place.status;
  el.dataset.selected = String(selected);
  el.hidden = !visible;
  el.setAttribute("aria-label", `${place.name}, ${STATUS_LABEL[place.status]}`);
  const art = el.firstElementChild as HTMLElement;
  const look = `${place.category}:${place.status}`;
  if (art.dataset.look !== look) {
    art.dataset.look = look;
    art.innerHTML = pinSvg(place.category, place.status);
  }
}

// Keeps the focused place clear of the side panel (desktop) or of the card
// or form sheet covering the bottom of the screen (phone).
function viewPadding(sheetHeight: number) {
  return window.matchMedia("(min-width: 768px)").matches
    ? { left: 392, top: 0, right: 0, bottom: 0 }
    : { left: 0, top: 60, right: 0, bottom: sheetHeight };
}

const CARD_HEIGHT = 300;
const FORM_HEIGHT = 440;

export default function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const draftMarker = useRef<Marker | null>(null);

  const places = usePlaces((s) => s.places);
  const selectedId = useUi((s) => s.selectedId);
  const status = useUi((s) => s.status);
  const category = useUi((s) => s.category);
  const pickMode = useUi((s) => s.pickMode);
  const form = useUi((s) => s.form);
  const draft = form?.mode === "add" ? form.draft : null;
  const draftLat = draft?.lat;
  const draftLng = draft?.lng;

  useEffect(() => {
    const pins = markers.current;
    const map = new MapLibreMap({
      container: container.current!,
      style: pixelStyle,
      center: VANCOUVER,
      zoom: 12,
      minZoom: 9.5,
      maxBounds: [
        [-124.4, 48.6],
        [-121.4, 50.0],
      ],
      // Low resolution on purpose: see MAP_PIXEL.
      pixelRatio: 1 / MAP_PIXEL,
      // A flat, north-up map, like a top-down game world.
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right",
    );
    map.on("click", (e) => {
      const ui = useUi.getState();
      if (ui.pickMode) ui.dropPin(e.lngLat.lat, e.lngLat.lng);
      else ui.select(null);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      pins.clear();
      draftMarker.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pins = markers.current;
    const seen = new Set<string>();
    for (const place of places) {
      seen.add(place.id);
      let marker = pins.get(place.id);
      if (!marker) {
        marker = new Marker({
          element: buildPin(() => useUi.getState().select(place.id)),
          anchor: "bottom",
        })
          .setLngLat([place.lng, place.lat])
          .addTo(map);
        pins.set(place.id, marker);
      }
      paintPin(
        marker.getElement(),
        place,
        place.id === selectedId,
        matchesFilter(place, status, category),
      );
    }
    for (const [id, marker] of pins) {
      if (!seen.has(id)) {
        marker.remove();
        pins.delete(id);
      }
    }
  }, [places, selectedId, status, category]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const place = usePlaces.getState().places.find((p) => p.id === selectedId);
    if (!place) return;
    map.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(map.getZoom(), 15.5),
      padding: viewPadding(CARD_HEIGHT),
      duration: 1400,
    });
  }, [selectedId]);

  // Preview marker for the place being added.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    draftMarker.current?.remove();
    draftMarker.current = null;
    if (draftLat === undefined || draftLng === undefined) return;
    const el = document.createElement("div");
    el.className = "pin";
    el.dataset.status = "draft";
    el.innerHTML = `<span class="pin-art">${pinSvg(null, "draft")}</span>`;
    draftMarker.current = new Marker({ element: el, anchor: "bottom" })
      .setLngLat([draftLng, draftLat])
      .addTo(map);
    map.flyTo({
      center: [draftLng, draftLat],
      zoom: Math.max(map.getZoom(), 15.5),
      padding: viewPadding(FORM_HEIGHT),
      duration: 1200,
    });
  }, [draftLat, draftLng]);

  return (
    // The library forces `position: relative` on its container, so the
    // full-screen positioning lives on a wrapper.
    <div className={`absolute inset-0 ${pickMode ? "map-picking" : ""}`}>
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
