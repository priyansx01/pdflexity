import { create } from 'zustand'
import type { SignState, CertInfo, SignatureZone, VerifiedSignature } from '@/features/security/sign/types'

interface SignStore extends SignState {
  setPdf: (file: File | null, bytes: ArrayBuffer | null) => void
  setTotalPages: (pages: number) => void
  setCurrentPage: (page: number) => void
  setCert: (path: string | null, info: CertInfo | null, passphrase?: string) => void
  setSignatureZone: (zone: SignatureZone | null) => void
  setSignatures: (signatures: VerifiedSignature[]) => void
  setStep: (step: SignState['step']) => void
  setError: (msg: string | null) => void
  setResult: (downloadUrl: string, downloadName: string) => void
  setFormData: (data: Partial<Pick<SignState, 'reason' | 'location' | 'contact' | 'showName' | 'showDate' | 'showReason'>>) => void
  reset: () => void
}

const initialState: SignState = {
  pdfFile: null,
  pdfBytes: null,
  totalPages: 0,
  currentPage: 1,
  certPath: null,
  certInfo: null,
  passphrase: "",
  signatureZone: null,
  signatures: [],
  step: "idle",
  errorMessage: null,
  downloadUrl: null,
  downloadName: null,
  reason: "",
  location: "",
  contact: "",
  showName: true,
  showDate: true,
  showReason: true,
}

export const useSignStore = create<SignStore>((set) => ({
  ...initialState,

  setPdf: (pdfFile, pdfBytes) => set({ pdfFile, pdfBytes, currentPage: 1, signatureZone: null, step: "idle", errorMessage: null }),
  setTotalPages: (totalPages) => set({ totalPages }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setCert: (certPath, certInfo, passphrase = "") => set({ certPath, certInfo, passphrase, errorMessage: null }),
  setSignatureZone: (signatureZone) => set({ signatureZone }),
  setSignatures: (signatures) => set({ signatures }),
  setStep: (step) => set({ step, errorMessage: null }),
  setError: (errorMessage) => set({ errorMessage, step: "error" }),
  
  setResult: (downloadUrl, downloadName) => set({
    step: "success",
    downloadUrl,
    downloadName,
    errorMessage: null
  }),

  setFormData: (data) => set((state) => ({ ...state, ...data })),

  reset: () => set((state) => {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl)
    return { ...initialState }
  })
}))
