export type SignStep = "idle" | "signing" | "verifying" | "success" | "error"

export interface CertInfo {
  common_name: string
  organization: string
  email: string
  valid_from: string
  valid_until: string
  issuer: string
  is_expired: boolean
}

export interface SignatureZone {
  x: number
  y: number
  width: number
  height: number
  page: number
}

export interface VerifiedSignature {
  signer: string
  date: string
  reason: string
  location: string
  intact: boolean
  cert_trusted: boolean
  cert_expired: boolean
  page: number
}

export interface SignState {
  pdfFile: File | null
  pdfBytes: ArrayBuffer | null
  totalPages: number
  currentPage: number
  certPath: string | null
  certInfo: CertInfo | null
  passphrase: string
  signatureZone: SignatureZone | null
  signatures: VerifiedSignature[]
  step: SignStep
  errorMessage: string | null
  downloadUrl: string | null
  downloadName: string | null
  
  // Sign form data
  reason: string
  location: string
  contact: string
  showName: boolean
  showDate: boolean
  showReason: boolean
}
