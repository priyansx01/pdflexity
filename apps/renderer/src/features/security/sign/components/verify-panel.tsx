"use client"

import * as React from "react"
import { useSignStore } from "@/stores/use-sign-store"
import { ShieldCheck, ShieldAlert, Loader2, Info } from "lucide-react"

export function VerifyPanel() {
  const store = useSignStore()
  const [loading, setLoading] = React.useState(false)

  const handleVerify = async () => {
    if (!store.pdfBytes) return
    setLoading(true)
    store.setError(null)
    try {
      const resp = await window.electronAPI.pdf.verify(store.pdfBytes)
      if (resp.success) {
        store.setSignatures(resp.data.signatures || [])
      } else {
        store.setError(resp.error)
      }
    } catch (e: any) {
       store.setError(e.message)
    } finally {
       setLoading(false)
    }
  }

  if (!store.pdfFile) return null

  return (
    <div className="p-4 space-y-4 border-t border-border/50">
      <div className="flex items-center justify-between">
         <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
           <ShieldCheck className="w-4 h-4" /> Verification
         </h3>
         <button onClick={handleVerify} disabled={loading} className="text-xs text-indigo-500 hover:text-indigo-600 disabled:opacity-50">
           {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : "Verify Now"}
         </button>
      </div>

      <div className="space-y-3">
         {store.signatures.length === 0 ? (
            <div className="text-xs text-muted-foreground/60 italic">No signatures verified yet.</div>
         ) : (
            store.signatures.map((sig, i) => (
               <div key={i} className="p-3 bg-muted/20 border border-border/50 rounded-lg text-xs space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                     {sig.signer}
                     {sig.intact && sig.cert_trusted && !sig.cert_expired ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                     ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                     )}
                  </div>
                  <div className="text-muted-foreground/80">{new Date(sig.date).toLocaleString()}</div>
                  {sig.reason && <div className="text-muted-foreground/80 line-clamp-1">Reason: {sig.reason}</div>}
                  
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                     <span className={sig.intact ? "text-emerald-500" : "text-red-500"}>
                        {sig.intact ? "Intact" : "Modified"}
                     </span>
                     <span className="text-muted-foreground/30">•</span>
                     <span className={sig.cert_trusted ? "text-emerald-500" : "text-amber-500"}>
                        {sig.cert_trusted ? "Trusted" : "Untrusted"}
                     </span>
                  </div>
               </div>
            ))
         )}
      </div>
    </div>
  )
}
