import { useWorld } from "./world";

// Tiny retro sound effects, made on the spot from square waves. No audio files.

let audio: AudioContext | null = null;

function beep(frequency: number, start: number, length: number, type: OscillatorType = "square", volume = 0.05) {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const from = audio.currentTime + start;
  // A quick fade in and out stops each note from clicking.
  gain.gain.setValueAtTime(0, from);
  gain.gain.linearRampToValueAtTime(volume, from + 0.01);
  gain.gain.setValueAtTime(volume, from + length - 0.03);
  gain.gain.linearRampToValueAtTime(0, from + length);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(from);
  oscillator.stop(from + length);
}

const SOUNDS = {
  /** A plain blip, for a tap that does nothing special. */
  tap: () => beep(880, 0, 0.07),
  /** The steam clock's whistle: two notes sounding together. */
  toot: () => {
    beep(523, 0, 0.5, "triangle", 0.08);
    beep(659, 0, 0.5, "triangle", 0.06);
    beep(523, 0.6, 0.35, "triangle", 0.08);
    beep(784, 0.6, 0.35, "triangle", 0.06);
  },
  /** Canada Place's horns play the opening of "O Canada" at noon. */
  horn: () => {
    beep(392, 0, 0.5, "sawtooth", 0.05);
    beep(466, 0.5, 0.38, "sawtooth", 0.05);
    beep(466, 0.88, 0.14, "sawtooth", 0.05);
    beep(311, 1.02, 0.75, "sawtooth", 0.05);
  },
  /** A quick rising sparkle. */
  sparkle: () => [1047, 1319, 1568, 2093].forEach((note, i) => beep(note, i * 0.07, 0.1)),
};

/** Plays a sound effect, unless sounds are switched off. */
export function play(sound: keyof typeof SOUNDS) {
  if (!useWorld.getState().sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    SOUNDS[sound]();
  } catch {
    // No sound on this device; the map works the same without it.
  }
}
