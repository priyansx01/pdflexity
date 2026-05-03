"use client"

// The feature page already has "use client" + lazy pdfjs init.
// We use a mounted guard instead of dynamic(ssr:false) because
// Turbopack 16 rejects ssr:false even inside Client Components.
import { useState, useEffect } from "react"
import ComparePdfPage from "@/features/security/compare/page"

export default function Page() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground/50">Loading PDF engine…</p>
        </div>
      </div>
    )
  }

  return <ComparePdfPage />
}
