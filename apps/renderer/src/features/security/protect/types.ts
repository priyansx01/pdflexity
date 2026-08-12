// ─── Protect PDF — shared types ───────────────────────────────────────────────

export type ProtectStep = "idle" | "protecting" | "success" | "error"

export interface ProtectState {
  file: File | null
  password: string
  confirmPassword: string
  showPassword: boolean
  showConfirm: boolean
  step: ProtectStep
  errorMessage: string | null
  downloadUrl: string | null
  downloadName: string
}

export const INITIAL_STATE: ProtectState = {
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

export interface DropZoneProps {
  isDragging: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export interface PasswordFieldProps {
  id: string
  placeholder: string
  value: string
  show: boolean
  onToggleShow: () => void
  onChange: (v: string) => void
  hasError?: boolean
}
