import { deletePhotos } from "./photos";
import { usePlaces } from "./store";
import type { Place } from "./types";
import { useUi } from "./ui";

// Removing something happens straight away, with a few seconds to take it
// back. Picture files are only deleted once that chance has passed.

/** How long the "Undo" button stays on screen. */
export const UNDO_MS = 6000;

/** Runs `finish` once the undo window has closed, unless it was undone. */
function afterWindow(wasUndone: () => boolean, finish: () => void, wait: number) {
  setTimeout(() => {
    if (!wasUndone()) finish();
  }, wait + 500);
}

export function removePlaceWithUndo(place: Place, wait = UNDO_MS) {
  let undone = false;
  usePlaces.getState().removePlace(place.id);
  useUi.getState().showToast(`Removed ${place.name}`, {
    label: "Undo",
    run: () => {
      undone = true;
      usePlaces.getState().restorePlace(place);
    },
  });
  afterWindow(() => undone, () => deletePhotos(place.photos), wait);
}

export function removePhotoWithUndo(place: Place, path: string, wait = UNDO_MS) {
  let undone = false;
  const index = place.photos.indexOf(path);
  usePlaces.getState().removePhoto(place.id, path);
  useUi.getState().showToast("Photo removed", {
    label: "Undo",
    run: () => {
      undone = true;
      usePlaces.getState().addPhoto(place.id, path, index);
    },
  });
  afterWindow(() => undone, () => deletePhotos([path]), wait);
}
