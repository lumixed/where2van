import { create } from "zustand";
import { reversePlace } from "./geocode";
import type { PlaceInput } from "./store";
import type { CategoryFilter, Place, StatusFilter } from "./types";

export type Form =
  | { mode: "add"; draft: PlaceInput | null }
  | { mode: "edit"; id: string; draft: PlaceInput };

export type PanelView = "places" | "calendar";

export interface Toast {
  key: number;
  text: string;
}

const DROPPED_PIN = "Dropped pin";

interface UiState {
  selectedId: string | null;
  form: Form | null;
  pickMode: boolean;
  /** Which side-panel tab is showing, and whether the panel is open on phones. */
  view: PanelView;
  panelOpen: boolean;
  status: StatusFilter;
  category: CategoryFilter;
  toast: Toast | null;
  select: (id: string | null) => void;
  openAdd: () => void;
  openEdit: (place: Place) => void;
  closeForm: () => void;
  setDraft: (draft: PlaceInput | null) => void;
  patchDraft: (patch: Partial<PlaceInput>) => void;
  startPick: () => void;
  cancelPick: () => void;
  dropPin: (lat: number, lng: number) => void;
  openPanel: (view: PanelView) => void;
  closePanel: () => void;
  setStatus: (status: StatusFilter) => void;
  setCategory: (category: CategoryFilter) => void;
  showToast: (text: string) => void;
  clearToast: () => void;
}

export const useUi = create<UiState>()((set, get) => ({
  selectedId: null,
  form: null,
  pickMode: false,
  view: "places",
  panelOpen: false,
  status: "all",
  category: "all",
  toast: null,
  select: (id) => set({ selectedId: id, panelOpen: id ? false : get().panelOpen }),
  openAdd: () =>
    set({ form: { mode: "add", draft: null }, panelOpen: false, pickMode: false }),
  openEdit: (place) =>
    set({
      form: {
        mode: "edit",
        id: place.id,
        draft: {
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          category: place.category,
          note: place.note,
        },
      },
    }),
  closeForm: () => set({ form: null, pickMode: false }),
  setDraft: (draft) => {
    const form = get().form;
    if (form?.mode === "add") set({ form: { mode: "add", draft } });
  },
  patchDraft: (patch) => {
    const form = get().form;
    if (form?.draft) {
      set({ form: { ...form, draft: { ...form.draft, ...patch } } as Form });
    }
  },
  startPick: () => set({ pickMode: true, selectedId: null }),
  cancelPick: () => set({ pickMode: false }),
  dropPin: (lat, lng) => {
    set({
      pickMode: false,
      form: {
        mode: "add",
        draft: {
          name: DROPPED_PIN,
          address: "",
          lat,
          lng,
          category: "eat",
          note: "",
        },
      },
    });
    // Fill in the nearest known place, unless a name has been typed or the
    // form has moved on by the time the lookup returns.
    reversePlace(lat, lng)
      .then((hit) => {
        const draft = get().form?.draft;
        if (!hit || !draft || draft.lat !== lat || draft.lng !== lng) return;
        if (draft.name !== DROPPED_PIN) return;
        get().patchDraft({
          name: hit.name,
          address: hit.address,
          category: hit.category,
        });
      })
      .catch(() => {});
  },
  openPanel: (view) => set({ view, panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  showToast: (text) => set({ toast: { text, key: Date.now() } }),
  clearToast: () => set({ toast: null }),
}));
