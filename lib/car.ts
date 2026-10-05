import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LngLat = [lng: number, lat: number];

// OSRM's public demo server: free driving directions on OpenStreetMap roads.
const ROUTER = "https://router.project-osrm.org/route/v1/driving";

interface CarState {
  lng: number;
  lat: number;
  /** Degrees clockwise from north. */
  heading: number;
  /** Drive mode: the camera follows the car and the steering pad shows. */
  driving: boolean;
  /** Which way the keys or the pad are pushing; (0, 0) when idle. */
  steer: { x: number; y: number };
  /** The road path being followed after "Drive there", if any. */
  route: LngLat[] | null;
  setDriving: (driving: boolean) => void;
  setSteer: (x: number, y: number) => void;
  /** Remembers where the car stopped. */
  park: (lng: number, lat: number, heading: number) => void;
  driveTo: (target: { lng: number; lat: number }) => Promise<void>;
  endRoute: () => void;
}

export const useCar = create<CarState>()(
  persist(
    (set, get) => ({
      // Starts in front of the Vancouver Art Gallery.
      lng: -123.1207,
      lat: 49.2827,
      heading: 0,
      driving: false,
      steer: { x: 0, y: 0 },
      route: null,
      setDriving: (driving) =>
        set(driving ? { driving } : { driving, steer: { x: 0, y: 0 }, route: null }),
      setSteer: (x, y) => {
        const { steer, route } = get();
        if (steer.x === x && steer.y === y) return;
        // Taking the wheel cancels the automatic drive.
        set({ steer: { x, y }, route: x || y ? null : route });
      },
      park: (lng, lat, heading) => set({ lng, lat, heading }),
      driveTo: async (target) => {
        const { lng, lat } = get();
        const end: LngLat = [target.lng, target.lat];
        set({ driving: true, steer: { x: 0, y: 0 }, route: null });
        let road: LngLat[] = [];
        try {
          const res = await fetch(
            `${ROUTER}/${lng},${lat};${end[0]},${end[1]}?overview=full&geometries=geojson`,
          );
          if (res.ok) road = (await res.json()).routes?.[0]?.geometry?.coordinates ?? [];
        } catch {
          // No directions available: the car heads straight there instead.
        }
        if (get().driving) set({ route: [[lng, lat], ...road, end] });
      },
      endRoute: () => set({ route: null }),
    }),
    {
      name: "where2van:car",
      partialize: ({ lng, lat, heading }) => ({ lng, lat, heading }),
    },
  ),
);
