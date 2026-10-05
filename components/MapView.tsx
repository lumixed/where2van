"use client";

import { useEffect, useRef } from "react";
import {
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { groupPoints } from "@/lib/cluster";
import { MAP_PIXEL, pixelStyle } from "@/lib/mapStyle";
import { pinSvg } from "@/lib/pixel";
import { usePlaces } from "@/lib/store";
import { matchesFilter, STATUS_LABEL, type Place } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { useWorld } from "@/lib/world";
import { pinPreview } from "./pinPreview";
import { useLife } from "./useLife";
import { WorldControl } from "./worldControl";

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
  if (el.dataset.status === "want" && place.status === "done") {
    el.classList.add("stamped");
    setTimeout(() => el.classList.remove("stamped"), 700);
  }
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
/** Pins closer together than this, on screen, merge into one numbered pin. */
const GROUP_RADIUS = 34;
/** Zoomed in this far, pins are never merged: there is nowhere closer to go. */
const GROUP_UNTIL_ZOOM = 16.5;

export default function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const draftMarker = useRef<Marker | null>(null);
  const groupMarkers = useRef<Marker[]>([]);

  const places = usePlaces((s) => s.places);
  const selectedId = useUi((s) => s.selectedId);
  const previewId = useUi((s) => s.previewId);
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
      style: pixelStyle(useWorld.getState().phase),
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
    map.addControl(new WorldControl(), "bottom-right");
    // The colours follow the time of day; only what changed is redrawn.
    const stopWatching = useWorld.subscribe((world, before) => {
      if (world.phase !== before.phase) map.setStyle(pixelStyle(world.phase));
    });
    map.on("click", (e) => {
      const ui = useUi.getState();
      if (ui.pickMode) ui.dropPin(e.lngLat.lat, e.lngLat.lng);
      else ui.select(null);
    });
    mapRef.current = map;
    return () => {
      stopWatching();
      map.remove();
      mapRef.current = null;
      pins.clear();
      draftMarker.current = null;
      groupMarkers.current = [];
    };
  }, []);

  useLife(mapRef);

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
          // First tap: a small preview. Second tap, or a tap on the preview: the card.
          element: buildPin(() => {
            const ui = useUi.getState();
            if (ui.previewId === place.id) ui.select(place.id);
            else ui.preview(place.id);
          }),
          anchor: "bottom",
        })
          .setLngLat([place.lng, place.lat])
          .addTo(map);
        pins.set(place.id, marker);
      }
      paintPin(
        marker.getElement(),
        place,
        place.id === selectedId || place.id === previewId,
        matchesFilter(place, status, category),
      );
    }
    for (const [id, marker] of pins) {
      if (!seen.has(id)) {
        marker.remove();
        pins.delete(id);
      }
    }
  }, [places, selectedId, previewId, status, category]);

  // Pins that would sit on top of each other merge into one numbered pin,
  // which zooms in on its members when tapped. Redone whenever the zoom changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pins = markers.current;
    const regroup = () => {
      for (const marker of groupMarkers.current) marker.remove();
      groupMarkers.current = [];
      // The pin in focus always stands alone.
      const loose = places.filter(
        (p) => matchesFilter(p, status, category) && p.id !== selectedId && p.id !== previewId,
      );
      const groups =
        map.getZoom() >= GROUP_UNTIL_ZOOM
          ? []
          : groupPoints(
              loose.map((p) => ({ id: p.id, ...map.project([p.lng, p.lat]) })),
              GROUP_RADIUS,
            ).filter((ids) => ids.length > 1);
      const grouped = new Set(groups.flat());
      for (const [id, marker] of pins) {
        marker.getElement().dataset.grouped = String(grouped.has(id));
      }
      for (const ids of groups) {
        const members = loose.filter((p) => ids.includes(p.id));
        const done = members.filter((p) => p.status === "done").length;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cluster";
        el.dataset.kind = done === 0 ? "want" : done === members.length ? "done" : "mixed";
        el.textContent = String(members.length);
        el.setAttribute("aria-label", `${members.length} places here. Press to zoom in.`);
        const lngs = members.map((p) => p.lng);
        const lats = members.map((p) => p.lat);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          const room = viewPadding(0);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            {
              padding: {
                left: room.left + 70,
                right: room.right + 70,
                top: room.top + 90,
                bottom: room.bottom + 110,
              },
              maxZoom: 17,
              duration: 800,
            },
          );
        });
        const centre: [number, number] = [
          lngs.reduce((a, b) => a + b, 0) / lngs.length,
          lats.reduce((a, b) => a + b, 0) / lats.length,
        ];
        groupMarkers.current.push(new Marker({ element: el }).setLngLat(centre).addTo(map));
      }
    };
    regroup();
    map.on("zoom", regroup);
    return () => {
      map.off("zoom", regroup);
    };
  }, [places, selectedId, previewId, status, category]);

  // The preview bubble above a pin that has been tapped once.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !previewId) return;
    const place = places.find((p) => p.id === previewId);
    if (!place) return;
    const popup = new Popup({
      offset: 52,
      closeButton: false,
      closeOnClick: false,
      maxWidth: "250px",
      className: "pin-popup",
    })
      .setLngLat([place.lng, place.lat])
      .setDOMContent(pinPreview(place, () => useUi.getState().select(place.id)))
      .addTo(map);

    // If the pin is under the side panel or too near an edge for its bubble
    // to fit, slide the map over just enough to bring it into the open.
    const at = map.project([place.lng, place.lat]);
    const box = map.getContainer();
    const room = viewPadding(0);
    const hidden =
      at.x < room.left + 140 ||
      at.x > box.clientWidth - 140 ||
      at.y < room.top + 150 ||
      at.y > box.clientHeight - 110;
    if (hidden) map.easeTo({ center: [place.lng, place.lat], padding: room, duration: 500 });

    return () => {
      popup.remove();
    };
  }, [previewId, places]);

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
