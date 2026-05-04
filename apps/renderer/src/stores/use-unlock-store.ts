import { create } from 'zustand'
import type { UnlockState, UploadedFile } from '@/features/security/unlock/types'

interface UnlockStore extends UnlockState {
  setUploadedFile: (uploadedFile: UploadedFile | null) => void
  setPassword: (password: string) => void
  setShowPassword: (show: boolean) => void
  setStep: (step: UnlockState['step']) => void
  setAlreadyUnlocked: (uploadedFile: UploadedFile, downloadUrl: string) => void
  setResult: (downloadUrl: string) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useUnlockStore = create<UnlockStore>((set) => ({
  uploadedFile: null,
  password: "",
  showPassword: false,
  step: "idle",
  errorMessage: null,
  downloadUrl: null,

  setUploadedFile: (uploadedFile) => set({ uploadedFile, step: "idle", errorMessage: null }),
  setPassword: (password) => set({ password, errorMessage: null, step: "idle" }),
  setShowPassword: (showPassword) => set({ showPassword }),
  setStep: (step) => set({ step, errorMessage: null, downloadUrl: null, uploadedFile: null }),
  
  setAlreadyUnlocked: (uploadedFile, downloadUrl) => set({
    step: "alreadyUnlocked",
    uploadedFile,
    downloadUrl,
    errorMessage: null
  }),

  setResult: (downloadUrl) => set({
    step: "success",
    downloadUrl,
    errorMessage: null
  }),

  setError: (errorMessage) => set({ errorMessage, step: "error" }),

  reset: () => set((state) => {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl)
    return {
      uploadedFile: null,
      password: "",
      showPassword: false,
      step: "idle",
      errorMessage: null,
      downloadUrl: null,
    }
  })
}))
