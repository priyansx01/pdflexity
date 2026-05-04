import { create } from 'zustand'
import type { ProtectState } from '@/features/security/protect/types'

interface ProtectStore extends ProtectState {
  setFile: (file: File | null) => void
  setPassword: (password: string) => void
  setConfirmPassword: (confirmPassword: string) => void
  setShowPassword: (show: boolean) => void
  setShowConfirm: (show: boolean) => void
  setStep: (step: ProtectState['step']) => void
  setResult: (downloadUrl: string, downloadName: string) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useProtectStore = create<ProtectStore>((set) => ({
  file: null,
  password: "",
  confirmPassword: "",
  showPassword: false,
  showConfirm: false,
  step: "idle",
  errorMessage: null,
  downloadUrl: null,
  downloadName: "",

  setFile: (file) => set({ file, step: "idle", errorMessage: null }),
  setPassword: (password) => set({ password, errorMessage: null, step: "idle" }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword, errorMessage: null, step: "idle" }),
  setShowPassword: (showPassword) => set({ showPassword }),
  setShowConfirm: (showConfirm) => set({ showConfirm }),
  setStep: (step) => set({ step, errorMessage: null }),

  setResult: (downloadUrl, downloadName) => set({
    step: "success",
    downloadUrl,
    downloadName,
    errorMessage: null
  }),

  setError: (errorMessage) => set({ errorMessage, step: "error" }),

  reset: () => set((state) => {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl)
    return {
      file: null,
      password: "",
      confirmPassword: "",
      showPassword: false,
      showConfirm: false,
      step: "idle",
      errorMessage: null,
      downloadUrl: null,
      downloadName: "",
    }
  })
}))
