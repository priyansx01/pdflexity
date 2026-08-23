"use client";

import { create } from "zustand";

export type RecentEntry = {
  toolId: string;
  fileName: string;
  /** Absolute path of the saved output, when it has been saved somewhere. */
  path?: string;
  /** epoch ms */
  at: number;
};

const STORAGE_KEY = "pdflexity.recent";
const MAX_ENTRIES = 8;

function load(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (e) =>
            e &&
            typeof e.toolId === "string" &&
            typeof e.fileName === "string" &&
            (e.path === undefined || typeof e.path === "string"),
        )
      : [];
  } catch {
    return [];
  }
}

function persist(entries: RecentEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

interface RecentStore {
  recent: RecentEntry[];
  add: (entry: Omit<RecentEntry, "at"> & { at?: number }) => void;
  /** Attach/refresh the saved path of an existing entry (after Save as…). */
  setPath: (toolId: string, fileName: string, path: string) => void;
  clear: () => void;
}

/**
 * Recently completed operations (per output file), persisted to localStorage
 * and capped at MAX_ENTRIES. Entries are recorded once the output has been
 * saved, carrying its absolute path so the rail can reveal it in Explorer.
 * Re-completing the same file with the same tool moves the entry to the top.
 */
export const useRecent = create<RecentStore>((set) => ({
  recent: [],
  add: ({ toolId, fileName, path, at }) => {
    set((state) => {
      const now = at ?? Date.now();
      // Drop older duplicates of this tool+file, then prepend.
      const deduped = state.recent.filter(
        (e) => !(e.toolId === toolId && e.fileName === fileName),
      );
      const next = [{ toolId, fileName, path, at: now }, ...deduped].slice(0, MAX_ENTRIES);
      persist(next);
      return { recent: next };
    });
  },
  setPath: (toolId, fileName, path) => {
    set((state) => {
      const next = state.recent.map((e) =>
        e.toolId === toolId && e.fileName === fileName ? { ...e, path } : e,
      );
      persist(next);
      return { recent: next };
    });
  },
  clear: () => {
    persist([]);
    set({ recent: [] });
  },
}));

// Hydrate once on the client.
if (typeof window !== "undefined") {
  useRecent.setState({ recent: load() });
}
