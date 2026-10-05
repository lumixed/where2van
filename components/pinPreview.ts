import { formatDay, formatPlan } from "@/lib/dates";
import { photoUrl } from "@/lib/photos";
import { starSvg } from "@/lib/pixel";
import { overall } from "@/lib/ratings";
import { useSync } from "@/lib/remote";
import { CATEGORY_LABEL, STATUS_LABEL, type Place } from "@/lib/types";

function line(className: string, text: string) {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

/**
 * The small bubble a pin shows on its first tap: a photo if there is one,
 * the name, and a line about where things stand. Tapping it opens the card.
 */
export function pinPreview(place: Place, open: () => void): HTMLElement {
  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = "pin-bubble";
  bubble.addEventListener("click", open);

  if (useSync.getState().photos && place.photos[0]) {
    const photo = document.createElement("img");
    photo.src = photoUrl(place.photos[0], true);
    photo.alt = "";
    bubble.append(photo);
  }

  const text = document.createElement("span");
  text.className = "pin-bubble-text";
  text.append(line("pin-bubble-name", place.name));

  const score = overall(place);
  if (place.status === "done" && score !== null) {
    const stars = document.createElement("span");
    stars.className = "pin-bubble-stars";
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", `${score} out of 5 stars`);
    stars.innerHTML = [1, 2, 3, 4, 5]
      .map((n) => starSvg(score >= n ? "full" : score >= n - 0.5 ? "half" : "none"))
      .join("");
    text.append(stars);
  } else {
    const about =
      place.status === "done"
        ? place.doneAt
          ? `Done · ${formatDay(place.doneAt)}`
          : STATUS_LABEL.done
        : place.plannedFor
          ? `Planned · ${formatPlan(place.plannedFor, place.plannedTime)}`
          : `${CATEGORY_LABEL[place.category]} · ${STATUS_LABEL.want}`;
    text.append(line("pin-bubble-about", about));
  }
  text.append(line("pin-bubble-hint", "Tap to open"));
  bubble.append(text);
  return bubble;
}
