import { create } from "zustand";

export type CanvasState = "IDLE" | "LOADED" | "RUNNING" | "COMPLETE";

interface CanvasStateStore {
  state: CanvasState;
  setState: (state: CanvasState) => void;
  reset: () => void;
}

/**
 * Shared canvas state so StatusStrip can show IDLE/LOADED/RUNNING/COMPLETE
 * while WorkCanvas owns the transition logic.
 */
export const useCanvasState = create<CanvasStateStore>((set) => ({
  state: "IDLE",
  setState: (state) => set({ state }),
  reset: () => set({ state: "IDLE" }),
}));
