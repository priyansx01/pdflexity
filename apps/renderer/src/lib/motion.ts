/**
 * Centralized motion presets (Graphite & Ember spec). Components may use these
 * or equivalent inline values; this file documents the intended feel.
 *
 * Reduced-motion policy: the app is wrapped in <MotionConfig reducedMotion="user">
 * (imported from motion/react in AppShell) so transform/layout animations are
 * dropped automatically when the OS preference is set, while opacity crossfades
 * are retained. globals.css additionally caps CSS transitions under
 * prefers-reduced-motion.
 */
export const SPRINGS = {
  step: { type: "spring" as const, stiffness: 420, damping: 34 },
  railMarker: { type: "spring" as const, stiffness: 500, damping: 40 },
  toggleKnob: { type: "spring" as const, stiffness: 600, damping: 34 },
  segmentThumb: { type: "spring" as const, stiffness: 500, damping: 40 },
  overshoot: { type: "spring" as const, stiffness: 500, damping: 22 },
};

/** Linear progress fill — a spring here reads as lag. */
export const PROGRESS = { duration: 0.12, ease: "linear" as const };
