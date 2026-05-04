import { create } from 'zustand'
import { arrayMove } from "@dnd-kit/sortable"
import type { OrganizeState, UploadedFile, PdfPage } from '@/features/organize/organize/types'

interface OrganizeStore extends OrganizeState {
  setStep: (step: OrganizeState['step']) => void
  addFiles: (files: UploadedFile[]) => void
  updateFilePages: (fileId: string, pagesCount: number, newPages: PdfPage[]) => void
  reorderPages: (oldIndex: number, newIndex: number) => void
  reorderFiles: (oldIndex: number, newIndex: number) => void
  rotatePage: (pageId: string) => void
  addBlankPage: (afterId: string) => void
  deletePage: (pageId: string) => void
  deleteFile: (fileId: string) => void
  sortAZ: () => void
  sort19: () => void
  reset: () => void
}

export const useOrganizeStore = create<OrganizeStore>((set) => ({
  step: "upload",
  files: [],
  pages: [],
  errorMessage: null,

  setStep: (step) => set({ step }),

  addFiles: (newFiles) => set((state) => ({
    step: "organize",
    files: [...state.files, ...newFiles],
    errorMessage: null
  })),

  updateFilePages: (fileId, pagesCount, newPages) => set((state) => {
    const fileExists = state.files.some(f => f.id === fileId)
    if (!fileExists) return state

    const nextFiles = state.files.map(f => f.id === fileId ? { ...f, numPages: pagesCount } : f)

    return {
      files: nextFiles,
      pages: [...state.pages, ...newPages]
    }
  }),

  reorderPages: (oldIndex, newIndex) => set((state) => ({
    pages: arrayMove(state.pages, oldIndex, newIndex)
  })),

  reorderFiles: (oldIndex, newIndex) => set((state) => {
    const nextFiles = arrayMove(state.files, oldIndex, newIndex)
    const newPagesOrder: PdfPage[] = []
    nextFiles.forEach(file => {
      const filePages = state.pages.filter(p => p.fileId === file.id)
      newPagesOrder.push(...filePages)
    })

    return { files: nextFiles, pages: newPagesOrder }
  }),

  rotatePage: (pageId) => set((state) => ({
    pages: state.pages.map(p => p.id === pageId ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p)
  })),

  addBlankPage: (afterId) => set((state) => {
    const pages = [...state.pages]
    const index = pages.findIndex(p => p.id === afterId)
    if (index === -1) return state
    
    const blankPage: PdfPage = {
      id: `blank-${crypto.randomUUID()}`,
      fileId: 'blank',
      pageNumber: 0,
      rotation: 0,
      isBlank: true
    }
    
    pages.splice(index + 1, 0, blankPage)
    return { pages }
  }),

  deletePage: (pageId) => set((state) => ({
    pages: state.pages.filter(p => p.id !== pageId)
  })),

  deleteFile: (fileId) => set((state) => {
    const nextFiles = state.files.filter(f => f.id !== fileId)
    const nextPages = state.pages.filter(p => p.fileId !== fileId)
    return {
      files: nextFiles,
      pages: nextPages,
      step: nextFiles.length === 0 ? "upload" : state.step
    }
  }),

  sortAZ: () => set((state) => {
    const sortedFiles = [...state.files].sort((a, b) => a.name.localeCompare(b.name))
    const sortedPages: PdfPage[] = []
    sortedFiles.forEach(file => {
      sortedPages.push(...state.pages.filter(p => p.fileId === file.id))
    })
    return { files: sortedFiles, pages: sortedPages }
  }),

  sort19: () => set((state) => {
    const sortedFiles = [...state.files].sort((a, b) => a.numPages - b.numPages)
    const sortedPages: PdfPage[] = []
    sortedFiles.forEach(file => {
      sortedPages.push(...state.pages.filter(p => p.fileId === file.id))
    })
    return { files: sortedFiles, pages: sortedPages }
  }),

  reset: () => set({ step: "upload", files: [], pages: [], errorMessage: null })
}))
