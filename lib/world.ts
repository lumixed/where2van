import { create } from "zustand";
import { persist } from "zustand/middleware";

// The map is a little living Vancouver: it follows the real time of day and
// the real weather there, wherever in the world the device happens to be.

export type Phase = "dawn" | "day" | "dusk" | "night";
export type PhaseChoice = "auto" | "day" | "dusk" | "night";
export type Sky = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export interface Weather {
  sky: Sky;
  /** How hard it is raining or snowing, 0 to 1. */
  intensity: number;
  /** How much of the sky is covered, 0 to 1. */
  cloud: number;
  /** Degrees Celsius. */
  temperature: number;
}

/** Minutes after midnight, Vancouver time. */
export interface SunTimes {
  sunrise: number;
  sunset: number;
}

const VANCOUVER = { latitude: 49.2827, longitude: -123.1207, timeZone: "America/Vancouver" };
// Open-Meteo: free weather data, no account or key.
const FORECAST =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${VANCOUVER.latitude}&longitude=${VANCOUVER.longitude}` +
  "&current=weather_code,temperature_2m,precipitation,cloud_cover" +
  "&daily=sunrise,sunset&forecast_days=1" +
  `&timezone=${encodeURIComponent(VANCOUVER.timeZone)}`;

/** Roughly when the sun rises and sets each month, for when the forecast is unreachable. */
const USUAL_SUN: [sunrise: number, sunset: number][] = [
  [8 * 60, 16 * 60 + 35],
  [7 * 60 + 20, 17 * 60 + 25],
  [7 * 60 + 30, 19 * 60 + 10],
  [6 * 60 + 25, 20 * 60],
  [5 * 60 + 35, 20 * 60 + 45],
  [5 * 60 + 7, 21 * 60 + 20],
  [5 * 60 + 25, 21 * 60 + 10],
  [6 * 60 + 5, 20 * 60 + 25],
  [6 * 60 + 50, 19 * 60 + 25],
  [7 * 60 + 35, 18 * 60 + 25],
  [7 * 60 + 25, 16 * 60 + 35],
  [8 * 60, 16 * 60 + 15],
];

/** The clock on the wall in Vancouver right now. */
export function vancouverNow(now = new Date()): { minutes: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VANCOUVER.timeZone,
    hour: "numeric",
    minute: "numeric",
    month: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { minutes: part("hour") * 60 + part("minute"), month: part("month") - 1 };
}

/** "3:42 p.m." */
export function formatClock(minutes: number): string {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Which look the map should have at a given minute of the day: golden for
 * about an hour around sunrise and sunset, night after dark.
 */
export function phaseAt(minutes: number, sun: SunTimes): Phase {
  if (minutes < sun.sunrise - 30) return "night";
  if (minutes < sun.sunrise + 45) return "dawn";
  if (minutes < sun.sunset - 60) return "day";
  if (minutes < sun.sunset + 30) return "dusk";
  return "night";
}

/** The weather service's numeric code, sorted into the few kinds the map can show. */
export function skyFor(code: number): Sky {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 51) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code >= 2) return "cloudy";
  return "clear";
}

export const SKY_LABEL: Record<Sky, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  fog: "Foggy",
  rain: "Raining",
  snow: "Snowing",
  storm: "Stormy",
};

/** "12:34" in a forecast timestamp like "2026-10-05T07:18" becomes minutes. */
function clockMinutes(stamp: string): number {
  const [hours, minutes] = stamp.slice(11, 16).split(":").map(Number);
  return hours * 60 + minutes;
}

interface WorldState {
  /** The look to use, after the player's choice is applied. */
  phase: Phase;
  /** "auto" follows the real time; the rest pin the map to one look. */
  choice: PhaseChoice;
  /** Vancouver's clock, in minutes after midnight. */
  minutes: number;
  sun: SunTimes;
  /** Null until the first forecast arrives, and when it cannot be reached. */
  weather: Weather | null;
  /** Whether tapping things makes sounds. */
  sound: boolean;
  /** Re-reads the clock; called once a minute. */
  tick: () => void;
  /** Fetches the current weather and today's sun times. */
  refresh: () => Promise<void>;
  cycleChoice: () => void;
  toggleSound: () => void;
}

const ORDER: PhaseChoice[] = ["auto", "day", "dusk", "night"];

export const useWorld = create<WorldState>()(
  persist(
    (set, get) => {
      const { minutes, month } = vancouverNow();
      const sun = { sunrise: USUAL_SUN[month][0], sunset: USUAL_SUN[month][1] };
      const settle = (patch: Partial<WorldState> = {}) => {
        const next = { ...get(), ...patch };
        set({
          ...patch,
          phase: next.choice === "auto" ? phaseAt(next.minutes, next.sun) : next.choice,
        });
      };
      return {
        phase: phaseAt(minutes, sun),
        choice: "auto",
        minutes,
        sun,
        weather: null,
        sound: true,
        tick: () => settle({ minutes: vancouverNow().minutes }),
        refresh: async () => {
          try {
            const response = await fetch(FORECAST);
            if (!response.ok) throw new Error(`Forecast failed (${response.status})`);
            const { current, daily } = await response.json();
            settle({
              minutes: vancouverNow().minutes,
              sun: {
                sunrise: clockMinutes(daily.sunrise[0]),
                sunset: clockMinutes(daily.sunset[0]),
              },
              weather: {
                sky: skyFor(current.weather_code),
                // 4 mm an hour and up counts as pouring.
                intensity: Math.min(1, Math.max(0.25, current.precipitation / 4)),
                cloud: current.cloud_cover / 100,
                temperature: Math.round(current.temperature_2m),
              },
            });
          } catch {
            // No forecast: keep the usual sun times and show no weather.
            settle({ weather: null });
          }
        },
        cycleChoice: () =>
          settle({ choice: ORDER[(ORDER.indexOf(get().choice) + 1) % ORDER.length] }),
        toggleSound: () => set({ sound: !get().sound }),
      };
    },
    {
      name: "where2van:world",
      partialize: ({ choice, sound }) => ({ choice, sound }),
      // A saved choice other than "auto" overrides the look worked out from the clock.
      merge: (saved, current) => {
        const kept = (saved ?? {}) as Partial<Pick<WorldState, "choice" | "sound">>;
        const choice = kept.choice ?? current.choice;
        return { ...current, ...kept, phase: choice === "auto" ? current.phase : choice };
      },
    },
  ),
);
