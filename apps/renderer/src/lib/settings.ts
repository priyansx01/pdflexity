"use client";

import { create } from "zustand";

export type PdflexitySettings = {
  /**
   * Where Save-as… dialogs start by default (a real folder chosen by the user),
   * or null to let the OS decide each time.
   */
  defaultSaveDir: string | null;
};

const STORAGE_KEY = "pdflexity.settings";

function load(): PdflexitySettings {
  if (typeof window === "undefined") return { defaultSaveDir: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { defaultSaveDir: null };
    const parsed = JSON.parse(raw) as Partial<PdflexitySettings>;
    return { defaultSaveDir: typeof parsed.defaultSaveDir === "string" ? parsed.defaultSaveDir : null };
  } catch {
    return { defaultSaveDir: null };
  }
}

interface SettingsStore extends PdflexitySettings {
  setDefaultSaveDir: (dir: string | null) => void;
}

/**
 * App settings, persisted to localStorage. Currently owns the default save
 * location; future options slot in here.
 */
export const useSettings = create<SettingsStore>((set) => ({
  defaultSaveDir: null,
  setDefaultSaveDir: (dir) => {
    set({ defaultSaveDir: dir });
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ defaultSaveDir: dir } satisfies PdflexitySettings),
      );
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  },
}));

// Hydrate from storage once on the client.
if (typeof window !== "undefined") {
  const initial = load();
  useSettings.setState(initial);
}
