"use client"

import * as React from "react"
import { useSignStore } from "@/stores/use-sign-store"
import { Shield, Key, FileSignature, CheckCircle2, XCircle, FileText, Upload, Plus } from "lucide-react"

export function DocumentPanel() {
  const store = useSignStore()

  const handleOpenPdf = async () => {
    // We would use electron API to open a file here, or a standard input type="file"
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const bytes = await file.arrayBuffer()
        store.setPdf(file, bytes)
        // Note: verification trigger would go here if needed
      }
    }
    input.click()
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
        <FileText className="w-4 h-4" /> Document
      </h3>
      {store.pdfFile ? (
        <div className="p-3 bg-muted/30 border border-border/50 rounded-lg text-sm truncate relative group">
          <span className="font-medium text-foreground">{store.pdfFile.name}</span>
          <br/>
          <span className="text-xs text-muted-foreground">{(store.pdfFile.size / 1024 / 1024).toFixed(2)} MB</span>
          <button onClick={() => store.reset()} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground hidden group-hover:block">
             <XCircle className="w-4 h-4"/>
          </button>
        </div>
      ) : (
        <button onClick={handleOpenPdf} className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-sm font-medium transition-colors">
          <Upload className="w-4 h-4" /> Open PDF
        </button>
      )}
    </div>
  )
}

export function CertificatePanel() {
  const store = useSignStore()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleOpenCert = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".p12,.pfx"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Since we need an absolute path for the Go server, and standard input type="file" only gives a File object with no real path in standard web,
        // we'd typically use electron's openFile dialog. For now, we will mock it or assume the file.path exists (electron sometimes exposes it).
        const path = (file as any).path
        if (path) {
           store.setCert(path, null, "")
           setError(null)
        }
      }
    }
    input.click()
  }

  const handleLoadInfo = async () => {
    if (!store.certPath || !store.passphrase) return
    setLoading(true)
    setError(null)
    try {
       const resp = await window.electronAPI.pdf.certInfo(store.certPath, store.passphrase)
       if (resp.success) {
           store.setCert(store.certPath, resp.data, store.passphrase)
       } else {
           setError(resp.error)
       }
    } catch (e: any) {
       setError(e.message)
    } finally {
       setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 border-t border-border/50">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
        <Key className="w-4 h-4" /> Certificate
      </h3>

      {!store.certPath ? (
        <button onClick={handleOpenCert} className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted border border-border/50 rounded-lg text-sm font-medium transition-colors">
          <Upload className="w-4 h-4" /> Load .p12 / .pfx
        </button>
      ) : !store.certInfo ? (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground truncate">{store.certPath}</div>
          <input 
            type="password" 
            placeholder="Passphrase..." 
            className="w-full text-sm p-2 rounded-md bg-background border border-border focus:ring-1 focus:ring-indigo-500 outline-none"
            value={store.passphrase}
            onChange={e => store.setCert(store.certPath, null, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadInfo()}
          />
          <button 
            onClick={handleLoadInfo} 
            disabled={!store.passphrase || loading}
            className="w-full bg-indigo-500 text-white p-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Loading..." : "Unlock Certificate"}
          </button>
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      ) : (
        <div className="p-3 bg-muted/20 border border-border/50 rounded-lg text-xs space-y-2 relative group">
           <button onClick={() => store.setCert(null, null, "")} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground hidden group-hover:block">
             <XCircle className="w-4 h-4"/>
           </button>
           <div className="font-semibold text-foreground">{store.certInfo.common_name}</div>
           <div className="text-muted-foreground">{store.certInfo.organization || "No Organization"}</div>
           <div className="text-muted-foreground">{store.certInfo.email}</div>
           <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <span className={store.certInfo.is_expired ? "text-red-500 font-medium" : "text-emerald-500 font-medium"}>
                {new Date(store.certInfo.valid_until).toLocaleDateString()}
              </span>
           </div>
        </div>
      )}
    </div>
  )
}

export function SignaturePanel() {
  const store = useSignStore()

  const handlePlaceZone = () => {
    store.setSignatureZone({
      page: store.currentPage,
      x: 50,
      y: 50,
      width: 250,
      height: 80
    })
  }

  return (
    <div className="p-4 space-y-4 border-t border-border/50">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
        <FileSignature className="w-4 h-4" /> Signature Options
      </h3>

      <div className="space-y-3">
        {!store.signatureZone ? (
           <button onClick={handlePlaceZone} disabled={!store.pdfFile} className="w-full flex items-center justify-center gap-2 p-2 bg-muted/50 hover:bg-muted border border-border/50 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
             <Plus className="w-4 h-4" /> Place Signature Zone
           </button>
        ) : (
           <div className="text-xs text-indigo-500 bg-indigo-500/10 p-2 rounded border border-indigo-500/20 text-center">
             Zone placed on Page {store.signatureZone.page}
           </div>
        )}

        <div className="space-y-1.5">
           <label className="text-xs text-muted-foreground font-medium">Reason</label>
           <input 
              type="text" 
              placeholder="e.g. I approve this document" 
              className="w-full text-sm p-2 rounded-md bg-background border border-border focus:ring-1 focus:ring-indigo-500 outline-none"
              value={store.reason}
              onChange={e => store.setFormData({ reason: e.target.value })}
           />
        </div>
        <div className="space-y-1.5">
           <label className="text-xs text-muted-foreground font-medium">Location</label>
           <input 
              type="text" 
              placeholder="e.g. Mumbai, India" 
              className="w-full text-sm p-2 rounded-md bg-background border border-border focus:ring-1 focus:ring-indigo-500 outline-none"
              value={store.location}
              onChange={e => store.setFormData({ location: e.target.value })}
           />
        </div>
      </div>
    </div>
  )
}
