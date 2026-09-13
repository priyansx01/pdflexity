import { create } from "zustand";
import type { EditBlock, EditPage } from "@/lib/backend-types";

export type EditStep = "idle" | "loading" | "ready" | "saving" | "error";

/** A block plus whether the user changed it (drives redraw on save). */
export type EditableBlock = EditBlock & { edited?: boolean; originalText?: string };
export type EditablePage = Omit<EditPage, "blocks"> & { blocks: EditableBlock[] };

interface EditState {
  fileName: string | null;
  pdfBytes: ArrayBuffer | null;
  pages: EditablePage[];
  currentPage: number; // 1-based
  zoom: number; // percent
  step: EditStep;
  error: string | null;
  /** A document another tool (e.g. OCR) asked to open here; consumed on mount.
   *  When `pages` is provided (OCR hands off its recognized text), the editor
   *  uses it directly instead of re-extracting the original PDF. */
  pendingOpen: { name: string; buffer: ArrayBuffer; pages?: EditPage[] } | null;

  requestOpen: (name: string, buffer: ArrayBuffer, pages?: EditPage[]) => void;
  clearPendingOpen: () => void;
  setLoading: () => void;
  setDocument: (fileName: string, bytes: ArrayBuffer, pages: EditPage[]) => void;
  updateBlock: (page: number, blockId: string, updates: Partial<EditBlock>) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setStep: (step: EditStep) => void;
  setError: (msg: string | null) => void;
  /** All edited blocks flattened for the apply command. */
  collectEdits: () => (EditBlock & { page: number })[];
  reset: () => void;
}

const initial = {
  fileName: null as string | null,
  pdfBytes: null as ArrayBuffer | null,
  pages: [] as EditablePage[],
  currentPage: 1,
  zoom: 100,
  step: "idle" as EditStep,
  error: null as string | null,
  pendingOpen: null as { name: string; buffer: ArrayBuffer; pages?: EditPage[] } | null,
};

export const useEditStore = create<EditState>((set, get) => ({
  ...initial,

  requestOpen: (name, buffer, pages) => set({ pendingOpen: { name, buffer, pages }, step: "idle", error: null }),
  clearPendingOpen: () => set({ pendingOpen: null }),
  setLoading: () => set({ step: "loading", error: null }),

  setDocument: (fileName, bytes, pages) =>
    set({
      fileName,
      pdfBytes: bytes,
      pages: pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => ({ ...b })) })),
      currentPage: 1,
      step: "ready",
      error: null,
    }),

  updateBlock: (page, blockId, updates) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.page !== page
          ? p
          : {
              ...p,
              blocks: p.blocks.map((b) =>
                b.id === blockId
                  ? { ...b, ...updates, edited: true, originalText: b.originalText ?? b.text }
                  : b
              ),
            }
      ),
    })),

  setCurrentPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),
  setStep: (step) => set({ step }),
  setError: (error) => set({ error, step: error ? "error" : get().step }),

  collectEdits: () => {
    const out: (EditBlock & { page: number })[] = [];
    for (const p of get().pages) {
      for (const b of p.blocks) {
        if (b.edited) {
          const { edited: _e, originalText: _o, ...block } = b;
          out.push({ ...block, page: p.page });
        }
      }
    }
    return out;
  },

  reset: () => set({ ...initial }),
}));
