import { create } from "zustand";
import { supabase } from "./supabase";
import type { Category, Place, Status } from "./types";

/**
 * Where the app stands with the shared database.
 * - `local`: no database configured, everything stays on this device
 * - `loading`: fetching the shared map (the last known copy shows meanwhile)
 * - `ready`: showing the shared map and receiving live changes
 */
export type SyncPhase = "local" | "loading" | "ready";

interface SyncState {
  phase: SyncPhase;
  /** Goes up each time a change could not be saved, so the app can react. */
  failures: number;
}

export const useSync = create<SyncState>()(() => ({
  phase: supabase ? "loading" : "local",
  failures: 0,
}));

/** A row of the `places` table: the same place, with database-style names. */
export interface PlaceRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  note: string;
  created_at: string;
  planned_for: string | null;
  planned_time: string;
  done_at: string | null;
  rating: number | null;
  review: string;
}

export function toRow(place: Place): PlaceRow {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    category: place.category,
    status: place.status,
    note: place.note,
    created_at: place.createdAt,
    planned_for: place.plannedFor,
    planned_time: place.plannedTime,
    done_at: place.doneAt,
    rating: place.rating,
    review: place.review,
  };
}

export function fromRow(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    category: row.category as Category,
    status: row.status as Status,
    note: row.note,
    createdAt: row.created_at,
    plannedFor: row.planned_for,
    plannedTime: row.planned_time,
    doneAt: row.done_at,
    rating: row.rating,
    review: row.review,
  };
}

function reportFailure(error: unknown) {
  console.error("Where2Van could not save a change:", error);
  useSync.setState((s) => ({ failures: s.failures + 1 }));
}

/** Saves a new or changed place to the shared database. */
export function pushPlace(place: Place) {
  if (!supabase) return;
  supabase
    .from("places")
    .upsert(toRow(place))
    .then(({ error }) => error && reportFailure(error), reportFailure);
}

export function pushRemoval(id: string) {
  if (!supabase) return;
  supabase
    .from("places")
    .delete()
    .eq("id", id)
    .then(({ error }) => error && reportFailure(error), reportFailure);
}
