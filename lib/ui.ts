import { create } from "zustand";
import { reversePlace } from "./geocode";
import type { SpriteName } from "./pixel";
import type { PlaceInput } from "./store";
import type { CategoryFilter, Place, StatusFilter } from "./types";

export type Form =
  | { mode: "add"; draft: PlaceInput | null }
  | { mode: "edit"; id: string; draft: PlaceInput };

export type PanelView = "places" | "calendar" | "memories" | "badges";

export interface Toast {
  key: number;
  text: string;
  /** A button on the toast, such as "Undo". The toast then stays up longer. */
  action?: { label: string; run: () => void };
}

/** The pop-up for a badge that has just been earned. */
export interface Banner {
  key: number;
  title: string;
  text: string;
  icon: SpriteName;
}

const DROPPED_PIN = "Dropped pin";

interface UiState {
  selectedId: string | null;
  /** The pin showing its small preview bubble; a second tap opens the card. */
  previewId: string | null;
  form: Form | null;
  pickMode: boolean;
  /** Whether "Pick for us" is open. */
  picker: boolean;
  /** Whether the "Us" box (names and faces) is open. */
  us: boolean;
  /** The memory replay in progress: which places, in order, and where it is. */
  replay: { ids: string[]; index: number; playing: boolean } | null;
  /** Which side-panel tab is showing, and whether the panel is open on phones. */
  view: PanelView;
  panelOpen: boolean;
  status: StatusFilter;
  category: CategoryFilter;
  toast: Toast | null;
  banner: Banner | null;
  select: (id: string | null) => void;
  preview: (id: string | null) => void;
  openAdd: () => void;
  openEdit: (place: Place) => void;
  closeForm: () => void;
  setDraft: (draft: PlaceInput | null) => void;
  patchDraft: (patch: Partial<PlaceInput>) => void;
  startPick: () => void;
  cancelPick: () => void;
  dropPin: (lat: number, lng: number) => void;
  openPicker: () => void;
  closePicker: () => void;
  openUs: () => void;
  closeUs: () => void;
  startReplay: (ids: string[]) => void;
  /** Moves the replay on (or back); running off the end finishes it. */
  stepReplay: (by: number) => void;
  toggleReplay: () => void;
  stopReplay: () => void;
  openPanel: (view: PanelView) => void;
  closePanel: () => void;
  setStatus: (status: StatusFilter) => void;
  setCategory: (category: CategoryFilter) => void;
  showToast: (text: string, action?: Toast["action"]) => void;
  clearToast: () => void;
  showBanner: (banner: Omit<Banner, "key">) => void;
  clearBanner: () => void;
}

export const useUi = create<UiState>()((set, get) => ({
  selectedId: null,
  previewId: null,
  form: null,
  pickMode: false,
  picker: false,
  us: false,
  replay: null,
  view: "places",
  panelOpen: false,
  status: "all",
  category: "all",
  toast: null,
  banner: null,
  select: (id) =>
    set({
      selectedId: id,
      previewId: null,
      panelOpen: id ? false : get().panelOpen,
      // Opening a place ends a replay; closing one does not.
      replay: id ? null : get().replay,
    }),
  preview: (id) => set({ previewId: id, selectedId: null }),
  openAdd: () =>
    set({
      form: { mode: "add", draft: null },
      panelOpen: false,
      pickMode: false,
      picker: false,
      us: false,
    }),
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
  openPicker: () =>
    set({ picker: true, us: false, panelOpen: false, form: null, pickMode: false }),
  closePicker: () => set({ picker: false }),
  openUs: () => set({ us: true, picker: false, panelOpen: false, form: null, pickMode: false }),
  closeUs: () => set({ us: false }),
  startReplay: (ids) => {
    if (ids.length === 0) return;
    set({
      replay: { ids, index: 0, playing: true },
      selectedId: null,
      previewId: null,
      panelOpen: false,
      form: null,
      picker: false,
      us: false,
    });
  },
  stepReplay: (by) => {
    const replay = get().replay;
    if (!replay) return;
    const index = replay.index + by;
    if (index >= replay.ids.length) {
      set({ replay: null });
      get().showToast("That's all our memories so far");
    } else {
      set({ replay: { ...replay, index: Math.max(0, index) } });
    }
  },
  toggleReplay: () => {
    const replay = get().replay;
    if (replay) set({ replay: { ...replay, playing: !replay.playing } });
  },
  stopReplay: () => set({ replay: null }),
  openPanel: (view) => set({ view, panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  showToast: (text, action) => set({ toast: { text, action, key: Date.now() } }),
  clearToast: () => set({ toast: null }),
  showBanner: (banner) => set({ banner: { ...banner, key: Date.now() } }),
  clearBanner: () => set({ banner: null }),
}));
