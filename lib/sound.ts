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
  /** A plain blip, for pressing a button. */
  tap: () => beep(880, 0, 0.05, "square", 0.03),
  /** A place marked as done: a short rising run. */
  done: () => [523, 659, 784, 1047].forEach((note, i) => beep(note, i * 0.08, 0.12)),
  /** A badge earned: the same run, held at the top. */
  badge: () => {
    [523, 659, 784].forEach((note, i) => beep(note, i * 0.09, 0.1));
    beep(1047, 0.27, 0.4);
  },
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
