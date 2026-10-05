"use client";

import { usePlaces } from "@/lib/store";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  matchesFilter,
  STATUS_LABEL,
  type Place,
  type Status,
  type StatusFilter,
} from "@/lib/types";
import { useUi, type PanelView } from "@/lib/ui";
import { Tally } from "./Bars";
import CalendarView from "./CalendarView";
import MemoryBook from "./MemoryBook";
import { cn, Logo, PixelIcon } from "./pixel";
import PlaceRow from "./PlaceRow";

const VIEWS: { value: PanelView; label: string; icon: "list" | "calendar" | "heart" }[] = [
  { value: "places", label: "Places", icon: "list" },
  { value: "calendar", label: "Calendar", icon: "calendar" },
  { value: "memories", label: "Memories", icon: "heart" },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "want", label: STATUS_LABEL.want },
  { value: "done", label: STATUS_LABEL.done },
];

const SECTIONS: Status[] = ["want", "done"];

// To do: planned ones first, soonest on top, then the newest additions.
// Done: the latest memory on top.
function byListOrder(a: Place, b: Place) {
  if (a.status === "done") return (b.doneAt ?? "").localeCompare(a.doneAt ?? "");
  if (a.plannedFor && b.plannedFor) {
    return (a.plannedFor + a.plannedTime).localeCompare(b.plannedFor + b.plannedTime);
  }
  if (a.plannedFor || b.plannedFor) return a.plannedFor ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export default function PlacesPanel() {
  const view = useUi((s) => s.view);
  const panelOpen = useUi((s) => s.panelOpen);
  const { openPanel, closePanel, openAdd, openPicker } = useUi.getState();

  return (
    <>
      {panelOpen && (
        <div className="absolute inset-0 z-10 bg-ink/40 md:hidden" onClick={closePanel} />
      )}
      <aside
        aria-label="Our places"
        className={cn(
          "panel absolute z-20 flex-col",
          "inset-x-0 bottom-0 top-[10%] border-x-0 border-b-0",
          "md:inset-auto md:bottom-4 md:left-4 md:top-4 md:w-[360px] md:border-[3px]",
          panelOpen ? "pop flex" : "hidden md:flex",
        )}
      >
        <header className="divider px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="md:flex md:flex-1 md:items-center md:justify-between">
              <Logo className="text-base" />
              <Tally className="mt-2 md:mt-0" />
            </div>
            <button type="button" className="btn px-2.5 py-2.5 md:hidden" onClick={closePanel}>
              <PixelIcon name="close" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5" role="tablist" aria-label="View">
            {VIEWS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={view === tab.value}
                onClick={() => openPanel(tab.value)}
                className="btn gap-1.5 px-1 text-sm"
              >
                <PixelIcon name={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {view === "places" && <PlacesList />}
        {view === "calendar" && <CalendarView />}
        {view === "memories" && <MemoryBook />}

        <footer className="grid grid-cols-2 gap-2 border-t-[3px] border-ink p-3">
          <button type="button" className="btn py-3" onClick={openPicker}>
            <PixelIcon name="dice" />
            Pick for us
          </button>
          <button type="button" className="btn btn-want py-3" onClick={openAdd}>
            <PixelIcon name="plus" />
            Add a place
          </button>
        </footer>
      </aside>
    </>
  );
}

function PlacesList() {
  const places = usePlaces((s) => s.places);
  const status = useUi((s) => s.status);
  const category = useUi((s) => s.category);
  const { setStatus, setCategory } = useUi.getState();

  const inCategory = places.filter((p) => matchesFilter(p, "all", category));
  const sections = SECTIONS.filter((s) => status === "all" || status === s).map((s) => ({
    status: s,
    places: inCategory.filter((p) => p.status === s).sort(byListOrder),
  }));
  const shown = sections.reduce((n, s) => n + s.places.length, 0);

  return (
    <>
      <div className="divider space-y-2 px-4 py-3">
        <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Show">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className="btn px-1 text-sm"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className="btn chip"
          >
            <PixelIcon name="pin" />
            All
          </button>
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(category === value ? "all" : value)}
              className="btn chip"
            >
              <PixelIcon name={value} />
              {CATEGORY_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {places.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <PixelIcon name="pin" className="mx-auto size-[42px] text-heart" />
            <p className="mt-4 text-lg font-bold">Nothing on the map yet</p>
            <p className="mx-auto mt-1 max-w-[24ch] text-mute">
              Add the first place you two keep saying you&apos;ll try.
            </p>
          </div>
        ) : shown === 0 ? (
          <p className="px-4 py-10 text-center text-mute">Nothing matches this filter.</p>
        ) : (
          sections.map((section) => (
            <section key={section.status} aria-label={STATUS_LABEL[section.status]}>
              <h3 className="sticky top-0 z-[1] flex items-center justify-between bg-shade px-4 py-1.5 text-sm font-bold">
                {STATUS_LABEL[section.status]}
                <span className="text-mute">{section.places.length}</span>
              </h3>
              {section.places.length === 0 ? (
                <p className="px-4 py-3 text-sm text-mute">
                  {section.status === "want" ? "Nothing left to do here." : "Nothing done yet."}
                </p>
              ) : (
                <ul className="p-2">
                  {section.places.map((place) => (
                    <li key={place.id}>
                      <PlaceRow place={place} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </>
  );
}
