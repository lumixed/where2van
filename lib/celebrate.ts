import { badges, type Badge } from "./badges";
import type { Place } from "./types";

/** The places that went from "to do" to "done" between two versions of the list. */
export function newlyDone(before: Place[], after: Place[]): Place[] {
  const wasTodo = new Set(before.filter((p) => p.status === "want").map((p) => p.id));
  return after.filter((p) => p.status === "done" && wasTodo.has(p.id));
}

/** The badges that are earned now and have not been announced on this device. */
export function unannounced(places: Place[], announced: ReadonlySet<string>): Badge[] {
  return badges(places).filter((b) => b.have >= b.need && !announced.has(b.id));
}
