import type { IControl } from "maplibre-gl";
import { iconSvg, type SpriteName } from "@/lib/pixel";
import { useUi } from "@/lib/ui";
import { useWorld, type PhaseChoice } from "@/lib/world";

const CHOICE: Record<PhaseChoice, { icon: SpriteName; label: string; said: string }> = {
  auto: { icon: "clock", label: "Map follows the real time of day", said: "Following Vancouver's time of day" },
  day: { icon: "sun", label: "Map is always day", said: "Always daytime" },
  dusk: { icon: "sunset", label: "Map is always sunset", said: "Always sunset" },
  night: { icon: "moon", label: "Map is always night", said: "Always night" },
};

/**
 * Three buttons that sit with the zoom buttons: one cycles the map between
 * following the real time, always day, always sunset and always night; one
 * fades the parts of the city we have not been to; one turns sounds off.
 */
export class WorldControl implements IControl {
  private container?: HTMLDivElement;
  private unsubscribe?: () => void;

  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group world-ctrl";

    const time = document.createElement("button");
    time.type = "button";
    time.addEventListener("click", () => {
      useWorld.getState().cycleChoice();
      useUi.getState().showToast(CHOICE[useWorld.getState().choice].said);
    });

    const sound = document.createElement("button");
    sound.type = "button";
    sound.addEventListener("click", () => useWorld.getState().toggleSound());

    const explore = document.createElement("button");
    explore.type = "button";
    explore.addEventListener("click", () => {
      useWorld.getState().toggleExplore();
      useUi
        .getState()
        .showToast(
          useWorld.getState().explore
            ? "Places we haven't been are faded"
            : "The whole map is in full colour",
        );
    });

    const paint = () => {
      const world = useWorld.getState();
      const choice = CHOICE[world.choice];
      time.innerHTML = iconSvg(choice.icon);
      time.title = choice.label;
      time.setAttribute("aria-label", `${choice.label}. Press to change.`);
      sound.innerHTML = iconSvg(world.sound ? "soundOn" : "soundOff");
      sound.title = world.sound ? "Sounds are on" : "Sounds are off";
      sound.setAttribute("aria-label", `${sound.title}. Press to switch.`);
      sound.setAttribute("aria-pressed", String(world.sound));
      explore.innerHTML = iconSvg(world.explore ? "fog" : "pin");
      explore.title = world.explore
        ? "Fading the parts we haven't been to"
        : "Showing the whole map in full colour";
      explore.setAttribute("aria-label", `${explore.title}. Press to switch.`);
      explore.setAttribute("aria-pressed", String(world.explore));
    };
    paint();
    this.unsubscribe = useWorld.subscribe(paint);

    container.append(time, explore, sound);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.unsubscribe?.();
    this.container?.remove();
  }
}
