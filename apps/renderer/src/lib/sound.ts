"use client";

/**
 * Tiny asset-free notification sound via the Web Audio API. A shared
 * AudioContext is created lazily and must be unlocked by a user gesture
 * (browser/webview autoplay policy), so `unlockAudio()` is wired to the first
 * pointer/key interaction in the app shell. `playChime()` no-ops silently if
 * audio isn't available/unlocked yet.
 */

let ctx: AudioContext | null = null;

type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** Create/resume the shared AudioContext. Safe to call on every gesture. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** A soft two-note "ta-da" chime. Never throws. */
export function playChime(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  // Two ascending notes (E5, then A5).
  const notes: { freq: number; at: number; dur: number }[] = [
    { freq: 659.25, at: 0, dur: 0.16 },
    { freq: 880.0, at: 0.14, dur: 0.24 },
  ];

  for (const { freq, at, dur } of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + at;
    // Quick attack, gentle exponential release — no clicks.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}
