import { create } from "zustand"
import type { RedactionState, RedactionMark, SearchResult, PageDimension, RedactionAppearance } from "@/features/security/redact/types"

interface RedactStore extends RedactionState {
  setPdf: (file: File | null, bytes: ArrayBuffer | null, path?: string | null) => void
  setPageInfo: (total: number, dimensions: PageDimension[]) => void
  clearPdf: () => void
  setCurrentPage: (page: number) => void
  setZoom: (zoom: number) => void
  setViewerScale: (scale: number) => void
  addMark: (mark: Omit<RedactionMark, "id">) => void
  updateMark: (id: string, updates: Partial<RedactionMark>) => void
  removeMark: (id: string) => void
  removeMarks: (ids: string[]) => void
  clearMarks: () => void
  setSelectedMarkIds: (ids: string[]) => void
  toggleMarkSelection: (id: string) => void
  selectAllMarks: () => void
  deselectAllMarks: () => void
  setDrawingMode: (enabled: boolean) => void
  setAppearance: (appearance: Partial<RedactionAppearance>) => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: SearchResult[]) => void
  toggleSearchResultSelection: (id: string) => void
  selectAllSearchResults: () => void
  deselectAllSearchResults: () => void
  convertSearchResultsToMarks: () => void
  clearSearchResults: () => void
  setIsSearching: (loading: boolean) => void
  setStep: (step: RedactionState["step"]) => void
  setError: (error: string | null) => void
  setResult: (url: string, fileName: string, marksApplied: number) => void
  reset: () => void
}

const initialState: RedactionState = {
  pdfFile: null,
  pdfBytes: null,
  pdfPath: null,
  totalPages: 0,
  pageDimensions: [],
  currentPage: 1,
  zoom: 1.0,
  viewerScale: 1.0,
  marks: [],
  selectedMarkIds: [],
  drawingMode: false,
  appearance: {
    fillColor: "#000000",
    overlayLabel: "",
    labelColor: "#FFFFFF",
  },
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  step: "idle",
  error: null,
  resultUrl: null,
  resultFileName: null,
  marksApplied: 0,
}

export const useRedactStore = create<RedactStore>((set, get) => ({
  ...initialState,

  setPdf: (pdfFile, pdfBytes, pdfPath = null) =>
    set({
      pdfFile,
      pdfBytes,
      pdfPath,
      currentPage: 1,
      marks: [],
      searchResults: [],
      step: "loading",
      error: null,
    }),

  setPageInfo: (totalPages, pageDimensions) =>
    set({ totalPages, pageDimensions, step: "loaded" }),

  clearPdf: () => set(initialState),

  setCurrentPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom }),
  setViewerScale: (viewerScale) => set({ viewerScale }),

  addMark: (mark) =>
    set((state) => ({
      marks: [...state.marks, { ...mark, id: crypto.randomUUID() }],
    })),

  updateMark: (id, updates) =>
    set((state) => ({
      marks: state.marks.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  removeMark: (id) =>
    set((state) => ({
      marks: state.marks.filter((m) => m.id !== id),
      selectedMarkIds: state.selectedMarkIds.filter((sid) => sid !== id),
    })),

  removeMarks: (ids) =>
    set((state) => ({
      marks: state.marks.filter((m) => !ids.includes(m.id)),
      selectedMarkIds: state.selectedMarkIds.filter((sid) => !ids.includes(sid)),
    })),

  clearMarks: () => set({ marks: [], selectedMarkIds: [] }),

  setSelectedMarkIds: (selectedMarkIds) => set({ selectedMarkIds }),

  toggleMarkSelection: (id) =>
    set((state) => ({
      selectedMarkIds: state.selectedMarkIds.includes(id)
        ? state.selectedMarkIds.filter((sid) => sid !== id)
        : [...state.selectedMarkIds, id],
    })),

  selectAllMarks: () =>
    set((state) => ({
      selectedMarkIds: state.marks.map((m) => m.id),
    })),

  deselectAllMarks: () => set({ selectedMarkIds: [] }),

  setDrawingMode: (drawingMode) => set({ drawingMode }),

  setAppearance: (appearance) =>
    set((state) => ({
      appearance: { ...state.appearance, ...appearance },
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSearchResults: (searchResults) => set({ searchResults }),

  toggleSearchResultSelection: (id) =>
    set((state) => ({
      searchResults: state.searchResults.map((r) =>
        r.id === id ? { ...r, selected: !r.selected } : r
      ),
    })),

  selectAllSearchResults: () =>
    set((state) => ({
      searchResults: state.searchResults.map((r) => ({ ...r, selected: true })),
    })),

  deselectAllSearchResults: () =>
    set((state) => ({
      searchResults: state.searchResults.map((r) => ({ ...r, selected: false })),
    })),

  convertSearchResultsToMarks: () =>
    set((state) => {
      const newMarks: RedactionMark[] = state.searchResults
        .filter((r) => r.selected)
        .map((r) => ({
          id: crypto.randomUUID(),
          page: r.page,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          source: "search" as const,
          searchTerm: state.searchQuery,
        }))
      return {
        marks: [...state.marks, ...newMarks],
        searchResults: [],
      }
    }),

  clearSearchResults: () => set({ searchResults: [] }),

  setIsSearching: (isSearching) => set({ isSearching }),

  setStep: (step) => set({ step, error: null }),

  setError: (error) => set({ error, step: "error" }),

  setResult: (resultUrl, resultFileName, marksApplied) =>
    set({
      step: "success",
      resultUrl,
      resultFileName,
      marksApplied,
      error: null,
    }),

  reset: () => {
    const state = get()
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
    set(initialState)
  },
}))
