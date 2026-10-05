import { supabase } from "./supabase";

const BUCKET = "photos";
/** Longest side, in pixels, of the stored photo and of its small preview. */
const FULL = 1600;
const SMALL = 480;
const SMALL_SUFFIX = "_s.jpg";

/** How many photos one place can hold, to keep the free storage from filling up. */
export const MAX_PHOTOS = 12;

/** The small preview that is stored next to every photo. */
function smallPath(path: string) {
  return path.replace(/\.jpg$/, SMALL_SUFFIX);
}

/** Where a photo can be loaded from; `small` gives the preview for lists and grids. */
export function photoUrl(path: string, small = false): string {
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(small ? smallPath(path) : path).data
    .publicUrl;
}

/**
 * Scales a picture down so its longest side is at most `max` pixels and
 * re-saves it as a JPEG. A phone photo of several megabytes comes out at a
 * few hundred kilobytes, which keeps uploads quick and storage small.
 */
export async function shrink(file: Blob, max: number, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not save the picture"))),
      "image/jpeg",
      quality,
    ),
  );
}

/** Saves a photo and its preview to the shared storage; returns the photo's path. */
export async function storePhoto(placeId: string, full: Blob, small: Blob): Promise<string> {
  if (!supabase) throw new Error("Photos need the shared database");
  const path = `${placeId}/${crypto.randomUUID()}.jpg`;
  const options = { contentType: "image/jpeg", cacheControl: "31536000" };
  const bucket = supabase.storage.from(BUCKET);
  const saved = await bucket.upload(path, full, options);
  if (saved.error) throw saved.error;
  const preview = await bucket.upload(smallPath(path), small, options);
  if (preview.error) {
    void bucket.remove([path]);
    throw preview.error;
  }
  return path;
}

/** Shrinks a picture from the phone or computer and saves it for a place. */
export async function uploadPhoto(placeId: string, file: Blob): Promise<string> {
  const [full, small] = await Promise.all([shrink(file, FULL), shrink(file, SMALL)]);
  return storePhoto(placeId, full, small);
}

/** Faces are stored tiny on purpose: shown enlarged, they turn into pixel art. */
const FACE = 64;

/** Cuts the middle square out of a picture and shrinks it to a small face. */
export async function cropFace(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = FACE;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, FACE, FACE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not save the picture"))),
      "image/jpeg",
      0.9,
    ),
  );
}

/** Saves a face for the rating scale; returns its path. */
export async function uploadFace(file: Blob): Promise<string> {
  if (!supabase) throw new Error("Faces need the shared database");
  const path = `faces/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await cropFace(file), { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

/** Deletes photos and their previews from storage. Failing is harmless: just leftovers. */
export function deletePhotos(paths: string[]) {
  if (!supabase || paths.length === 0) return;
  supabase.storage
    .from(BUCKET)
    .remove(paths.flatMap((path) => [path, smallPath(path)]))
    .catch(() => {});
}
