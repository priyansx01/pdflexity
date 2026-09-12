import { create } from "zustand";

import { getTool, type RunOutcome } from "@/lib/tools";
import type { LoadedFile } from "@/lib/desktop";
import { defaultOptionValues, type OptionValues } from "@/components/canvas/options-panel";

export type Phase = "empty" | "loaded" | "running" | "done" | "error";

/** Per-tool working state for the shared WorkCanvas flow. */
export interface WorkSession {
  files: LoadedFile[];
  options: OptionValues;
  phase: Phase;
  result: RunOutcome | null;
  error: string | null;
  progress: number;
  durationMs: number;
}

export interface CompletedJob {
  toolId: string;
  toolName: string;
  fileName: string;
  ts: number;
}

export function emptySession(options: OptionValues): WorkSession {
  return {
    files: [],
    options,
    phase: "empty",
    result: null,
    error: null,
    progress: 0,
    durationMs: 0,
  };
}

const defaultsFor = (toolId: string): OptionValues =>
  defaultOptionValues(getTool(toolId)?.options ?? []);

const seen = (f: LoadedFile) => `${f.name}:${f.buffer.byteLength}`;

interface WorkspaceStore {
  /** toolId -> session. Module-global so it survives navigation/unmount. */
  sessions: Record<string, WorkSession>;
  /** The engine runs one op at a time; block a second concurrent run. */
  busy: boolean;
  /** Signal consumed by the global completion toaster. */
  lastCompleted: CompletedJob | null;

  ensureSession: (toolId: string) => void;
  /** Seed restored sessions from disk on launch (files + options only). */
  hydrate: (restored: Record<string, { files: LoadedFile[]; options: OptionValues }>) => void;
  setFiles: (toolId: string, files: LoadedFile[]) => void;
  addFiles: (toolId: string, incoming: LoadedFile[], multi: boolean) => void;
  removeFile: (toolId: string, index: number) => void;
  reorderFiles: (toolId: string, files: LoadedFile[]) => void;
  setOptions: (toolId: string, options: OptionValues) => void;
  setError: (toolId: string, error: string | null) => void;
  reset: (toolId: string) => void;
  clearCompleted: () => void;
  run: (toolId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const patch = (toolId: string, partial: Partial<WorkSession>) =>
    set((s) => {
      const base = s.sessions[toolId] ?? emptySession(defaultsFor(toolId));
      return { sessions: { ...s.sessions, [toolId]: { ...base, ...partial } } };
    });

  return {
    sessions: {},
    busy: false,
    lastCompleted: null,

    ensureSession: (toolId) =>
      set((s) =>
        s.sessions[toolId]
          ? s
          : { sessions: { ...s.sessions, [toolId]: emptySession(defaultsFor(toolId)) } }
      ),

    hydrate: (restored) =>
      set((s) => {
        const sessions = { ...s.sessions };
        for (const [toolId, r] of Object.entries(restored)) {
          sessions[toolId] = {
            ...emptySession(r.options),
            files: r.files,
            phase: r.files.length ? "loaded" : "empty",
          };
        }
        return { sessions };
      }),

    setFiles: (toolId, files) =>
      patch(toolId, { files, error: null, phase: files.length ? "loaded" : "empty" }),

    addFiles: (toolId, incoming, multi) =>
      set((s) => {
        const base = s.sessions[toolId] ?? emptySession(defaultsFor(toolId));
        let files: LoadedFile[];
        if (multi) {
          const have = new Set(base.files.map(seen));
          files = [...base.files, ...incoming.filter((f) => !have.has(seen(f)))];
        } else {
          files = incoming.slice(0, 1);
        }
        return {
          sessions: {
            ...s.sessions,
            [toolId]: { ...base, files, error: null, phase: files.length ? "loaded" : "empty" },
          },
        };
      }),

    removeFile: (toolId, index) =>
      set((s) => {
        const base = s.sessions[toolId] ?? emptySession(defaultsFor(toolId));
        const files = base.files.filter((_, i) => i !== index);
        return {
          sessions: {
            ...s.sessions,
            [toolId]: { ...base, files, phase: files.length ? base.phase : "empty" },
          },
        };
      }),

    reorderFiles: (toolId, files) => patch(toolId, { files }),

    setOptions: (toolId, options) => patch(toolId, { options }),

    setError: (toolId, error) => patch(toolId, { error }),

    reset: (toolId) =>
      set((s) => ({
        sessions: { ...s.sessions, [toolId]: emptySession(defaultsFor(toolId)) },
      })),

    clearCompleted: () => set({ lastCompleted: null }),

    run: async (toolId) => {
      const tool = getTool(toolId);
      const session = get().sessions[toolId];
      if (!tool || !session) return;

      const isMulti = !!tool.multiFile;
      const canRun = isMulti ? session.files.length >= 2 : session.files.length >= 1;
      if (!canRun) return;

      if (session.files.some((f) => f.buffer.byteLength === 0)) {
        patch(toolId, { error: "A loaded file is empty — clear it and drop the PDF again." });
        return;
      }
      if (get().busy) {
        patch(toolId, { error: "The engine is busy with another job — wait for it to finish." });
        return;
      }

      set({ busy: true });
      patch(toolId, { phase: "running", error: null, progress: 0 });
      const startedAt = performance.now();

      try {
        const outcome = await tool.run({
          files: session.files,
          options: session.options,
          onProgress: (pct) => patch(toolId, { progress: Math.max(0, Math.min(100, pct)) }),
        });
        patch(toolId, { progress: 100, durationMs: performance.now() - startedAt });
        const fileName =
          outcome.kind === "file" ? outcome.fileName : `${outcome.files.length} files`;
        // Mirror the UI's "100% then settle to done" beat. Lives here so it
        // completes even if the WorkCanvas that started it has unmounted.
        setTimeout(() => {
          patch(toolId, { result: outcome, phase: "done" });
          set({
            busy: false,
            lastCompleted: { toolId, toolName: tool.name, fileName, ts: Date.now() },
          });
        }, 260);
      } catch (e) {
        patch(toolId, { phase: "error", error: e instanceof Error ? e.message : String(e) });
        set({ busy: false });
      }
    },
  };
});
