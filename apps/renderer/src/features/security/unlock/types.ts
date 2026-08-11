// ─── Unlock PDF — Type Definitions ───────────────────────────────────────────
// Mirror of packages/shared/src/(pdfsecurity)/unlockpdf/types.ts
// These stay here for renderer-side type safety (no cross-package TS resolution needed)

export type UnlockStep = "idle" | "checking" | "unlocking" | "success" | "error" | "alreadyUnlocked"

export interface UploadedFile {
  file: File
  name: string
  sizeLabel: string
  isEncrypted: boolean
}

export interface UnlockState {
  uploadedFile: UploadedFile | null
  password: string
  showPassword: boolean
  step: UnlockStep
  errorMessage: string | null
  downloadUrl: string | null
}

export interface DropZoneProps {
  onFileSelect: (file: File) => void
  isDragging: boolean
  onDragEnter: () => void
  onDragLeave: () => void
}

export interface FileCardProps {
  uploadedFile: UploadedFile
  onReplace: () => void
}

export interface PasswordInputProps {
  value: string
  onChange: (val: string) => void
  showPassword: boolean
  onToggleShow: () => void
  hasError: boolean
  errorMessage: string | null
  disabled: boolean
  onSubmit: () => void
}

export interface SuccessCardProps {
  fileName: string
  downloadUrl: string
  onReset: () => void
}

export interface AlreadyUnlockedCardProps {
  fileName: string
  downloadUrl: string
  onReset: () => void
}
