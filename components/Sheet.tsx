"use client";

import { PixelIcon } from "./pixel";

/**
 * A titled box for one task, like adding a place.
 * Phone: a sheet over a dimmed map. Desktop: docked beside the side panel,
 * so the map stays visible and usable.
 */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center md:pointer-events-none md:justify-start md:pb-4 md:pl-[392px]"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-ink/40 md:hidden" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel pop scroll-thin relative max-h-[calc(100dvh-4rem)] w-full overflow-y-auto border-x-0 border-b-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pointer-events-auto md:w-[360px] md:border-[3px] md:pb-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" className="btn px-2.5 py-2.5" onClick={onClose}>
            <PixelIcon name="close" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
