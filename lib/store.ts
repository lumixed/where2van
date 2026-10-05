import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dayKey } from "./dates";
import { deletePhotos } from "./photos";
import { pushPlace, pushRemoval } from "./remote";
import { CATEGORIES, type Category, type PersonId, type Place } from "./types";

export interface PlaceInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  note: string;
}

export interface Memory {
  date: string;
  rating: number | null;
  review: string;
  /**
   * Whose rating this is. Left out, it is saved as the shared rating, which
   * is how it worked before we each had our own.
   */
  by?: PersonId;
}

interface PlacesState {
  places: Place[];
  addPlace: (input: PlaceInput) => Place;
  updatePlace: (
    id: string,
    patch: Pick<Place, "name" | "category" | "note">,
  ) => void;
  /** Puts a to-do on the calendar, or takes it off with `date: null`. */
  planVisit: (id: string, date: string | null, time: string) => void;
  /** Marks a place as done, with the day we went and how it was. */
  saveMemory: (id: string, memory: Memory) => void;
  moveToTodo: (id: string) => void;
  /** Attaches an uploaded photo to a place, or takes one off again. */
  addPhoto: (id: string, path: string) => void;
  removePhoto: (id: string, path: string) => void;
  removePlace: (id: string) => void;
  /**
   * Changes arriving from the shared database. Unlike the actions above,
   * these only update this device and are not sent back.
   */
  remote: {
    replaceAll: (places: Place[]) => void;
    upsert: (place: Place) => void;
    remove: (id: string) => void;
  };
}

/** Brings places saved by an older version of the app up to date. */
function upgrade(saved: unknown): Place[] {
  const places = (saved as { places?: Record<string, unknown>[] } | null)?.places;
  if (!Array.isArray(places)) return [];
  return places.map((old) => {
    const doneAt = typeof old.doneAt === "string" ? old.doneAt : null;
    return {
      ...old,
      // "do" was the only non-food category before there were seven.
      category: CATEGORIES.includes(old.category as Category)
        ? old.category
        : "activity",
      // Used to be a full timestamp; a memory only needs the day.
      doneAt: doneAt && doneAt.length > 10 ? dayKey(new Date(doneAt)) : doneAt,
      plannedFor: old.plannedFor ?? null,
      plannedTime: old.plannedTime ?? "",
      rating: old.rating ?? null,
      ratings: old.ratings ?? { a: null, b: null },
      review: old.review ?? "",
      photos: old.photos ?? [],
    } as Place;
  });
}

// Every change is applied on this device straight away and, when signed in,
// sent to the shared database. The browser's copy doubles as a cache, so the
// map shows up instantly while the latest version loads.
export const usePlaces = create<PlacesState>()(
  persist(
    (set, get) => {
      const edit = (id: string, patch: Partial<Place>) => {
        const before = get().places.find((p) => p.id === id);
        if (!before) return;
        const after = { ...before, ...patch };
        set({ places: get().places.map((p) => (p.id === id ? after : p)) });
        pushPlace(after);
      };
      return {
        places: [],
        addPlace: (input) => {
          const place: Place = {
            ...input,
            id: crypto.randomUUID(),
            status: "want",
            createdAt: new Date().toISOString(),
            plannedFor: null,
            plannedTime: "",
            doneAt: null,
            rating: null,
            ratings: { a: null, b: null },
            review: "",
            photos: [],
          };
          set({ places: [place, ...get().places] });
          pushPlace(place);
          return place;
        },
        updatePlace: edit,
        planVisit: (id, date, time) =>
          edit(id, { plannedFor: date, plannedTime: date ? time : "" }),
        saveMemory: (id, memory) => {
          const place = get().places.find((p) => p.id === id);
          if (!place) return;
          edit(id, {
            status: "done",
            doneAt: memory.date,
            review: memory.review,
            plannedFor: null,
            plannedTime: "",
            // A personal rating takes over from the old shared one.
            ...(memory.by
              ? { rating: null, ratings: { ...place.ratings, [memory.by]: memory.rating } }
              : { rating: memory.rating }),
          });
        },
        moveToTodo: (id) =>
          edit(id, {
            status: "want",
            doneAt: null,
            rating: null,
            ratings: { a: null, b: null },
            review: "",
          }),
        addPhoto: (id, path) => {
          const place = get().places.find((p) => p.id === id);
          if (place) edit(id, { photos: [...place.photos, path] });
        },
        removePhoto: (id, path) => {
          const place = get().places.find((p) => p.id === id);
          if (!place) return;
          edit(id, { photos: place.photos.filter((p) => p !== path) });
          deletePhotos([path]);
        },
        removePlace: (id) => {
          const place = get().places.find((p) => p.id === id);
          set({ places: get().places.filter((p) => p.id !== id) });
          pushRemoval(id);
          if (place) deletePhotos(place.photos);
        },
        remote: {
          replaceAll: (places) => set({ places }),
          upsert: (place) => {
            const places = get().places;
            set({
              places: places.some((p) => p.id === place.id)
                ? places.map((p) => (p.id === place.id ? place : p))
                : [place, ...places],
            });
          },
          remove: (id) => set({ places: get().places.filter((p) => p.id !== id) }),
        },
      };
    },
    {
      name: "where2van:v1",
      version: 5,
      partialize: (state) => ({ places: state.places }),
      migrate: (saved) => ({ places: upgrade(saved) }),
    },
  ),
);
