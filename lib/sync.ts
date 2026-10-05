import type { RealtimeChannel } from "@supabase/supabase-js";
import { completePeople, usePeople } from "./people";
import { fromRow, toRow, useSync, type PlaceRow } from "./remote";
import { usePlaces } from "./store";
import { supabase } from "./supabase";
import { useUi } from "./ui";

/** Set once this device's own places have been copied to the shared map. */
const IMPORTED_FLAG = "where2van:imported";
const UUID = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** Replaces this device's places with the shared map's current contents. */
async function refresh() {
  if (!supabase) return;
  const { data, error } = await supabase.from("places").select("*");
  if (error) throw error;
  usePlaces.getState().remote.replaceAll((data as PlaceRow[]).map(fromRow));
}

/** Photos need the latest database setup; until it has been run, they stay off. */
async function checkPhotos() {
  if (!supabase) return;
  const { error } = await supabase.from("places").select("photos").limit(1);
  useSync.setState({ photos: !error });
}

/** A rating each needs the latest setup too. When it is there, load our names and faces. */
async function checkPeople() {
  if (!supabase) return;
  const [columns, settings] = await Promise.all([
    supabase.from("places").select("rating_a").limit(1),
    supabase.from("settings").select("people").eq("id", 1).maybeSingle(),
  ]);
  const ready = !columns.error && !settings.error;
  useSync.setState({ people: ready });
  if (ready && settings.data) {
    usePeople.getState().replaceFromRemote(completePeople(settings.data.people));
  }
}

/**
 * The first time a device connects, the places already saved on it are
 * copied up, so nothing added before sync existed is lost. It runs once per
 * device: afterwards the shared map is the single source of truth, otherwise
 * a place deleted by one of us could be resurrected by the other's stale copy.
 */
async function importLocalPlaces() {
  if (!supabase || localStorage.getItem(IMPORTED_FLAG)) return;
  const local = usePlaces.getState().places;
  if (local.length > 0) {
    const rows = local.map((place) =>
      toRow(UUID.test(place.id) ? place : { ...place, id: crypto.randomUUID() }),
    );
    // Places already on the shared map keep the shared version.
    const { error } = await supabase
      .from("places")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  localStorage.setItem(IMPORTED_FLAG, "1");
}

/** Applies the other person's changes the moment they happen. */
function listen(): RealtimeChannel | null {
  if (!supabase) return null;
  const { remote } = usePlaces.getState();
  return supabase
    .channel("places")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "places" },
      (change) => {
        if (change.eventType === "DELETE") remote.remove((change.old as PlaceRow).id);
        else remote.upsert(fromRow(change.new as PlaceRow));
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settings" },
      (change) => {
        if (change.eventType === "DELETE") return;
        const { people } = change.new as { people: unknown };
        usePeople.getState().replaceFromRemote(completePeople(people));
      },
    )
    .subscribe();
}

/**
 * Connects the app to the shared database. Call once when the app opens;
 * the returned function disconnects it again.
 */
export function startSync() {
  const client = supabase;
  if (!client) return () => {};

  let stopped = false;
  let channel: RealtimeChannel | null = null;

  (async () => {
    try {
      await Promise.all([checkPhotos(), checkPeople()]);
      await importLocalPlaces();
      await refresh();
      if (!stopped) channel = listen();
    } catch (error) {
      console.error("Where2Van could not load the shared map:", error);
      useUi.getState().showToast("Couldn't load the shared map");
    }
    useSync.setState({ phase: "ready" });
  })();

  // A phone that was asleep may have missed live updates: catch up on return.
  const catchUp = () => {
    if (document.visibilityState === "visible" && useSync.getState().phase === "ready") {
      refresh().catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", catchUp);
  window.addEventListener("online", catchUp);

  // If a change could not be saved, say so and show what is really stored.
  const unsubscribe = useSync.subscribe((sync, before) => {
    if (sync.failures === before.failures) return;
    useUi.getState().showToast("Couldn't save that. Check your connection.");
    refresh().catch(() => {});
  });

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", catchUp);
    window.removeEventListener("online", catchUp);
    unsubscribe();
    if (channel) void client.removeChannel(channel);
  };
}
