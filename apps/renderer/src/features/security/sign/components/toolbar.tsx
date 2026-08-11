"use client"

import * as React from "react"
import { useSignStore } from "@/stores/use-sign-store"
import { PenTool, Download, Loader2 } from "lucide-react"
import { SuccessCard } from "@/features/security/protect/components/success-card"

export function SignToolbar() {
  const store = useSignStore()
  const [signing, setSigning] = React.useState(false)

  const canSign = store.pdfFile && store.certInfo && store.signatureZone && store.step !== "success"

  const handleSign = async () => {
    if (!canSign) return
    setSigning(true)
    store.setError(null)
    try {
      const options = {
        pdfBytes: Array.from(new Uint8Array(store.pdfBytes!)),
        fileName: store.pdfFile!.name,
        certPath: store.certPath,
        passphrase: store.passphrase,
        page: store.signatureZone!.page,
        zone: store.signatureZone,
        reason: store.reason,
        location: store.location,
        contact: store.contact,
        appearance: {
          showName: store.showName,
          showDate: store.showDate,
          showReason: store.showReason,
        }
      }

      const resp = await window.electronAPI.pdf.sign(options)
      if (resp.success) {
        // Convert base64 back to Blob URL
        const binary = atob(resp.data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
        
        store.setResult(url, resp.fileName)
      } else {
        store.setError(resp.error)
      }
    } catch (e: any) {
      store.setError(e.message)
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-background/50 backdrop-blur-md">
      <div className="flex items-center gap-2">
         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <PenTool className="w-4 h-4 text-indigo-500" />
         </div>
         <span className="font-bold text-sm tracking-tight">SignSeal</span>
      </div>

      <div className="flex items-center gap-3">
         {store.step === "success" ? (
            <button onClick={() => store.reset()} className="px-4 py-1.5 text-sm font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors">
               Start Over
            </button>
         ) : (
            <button 
               onClick={handleSign}
               disabled={!canSign || signing}
               className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
               {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
               Sign Document
            </button>
         )}
      </div>
    </div>
  )
}
