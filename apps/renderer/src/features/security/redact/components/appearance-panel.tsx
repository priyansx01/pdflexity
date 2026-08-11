"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AppearancePanel() {
  const store = useRedactStore()

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/10">
            <div className="h-3 w-3 rounded-sm bg-[#10b981]" />
          </div>
          <h3 className="text-[13px] font-semibold">Appearance</h3>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-medium">Fill Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={store.appearance.fillColor}
              onChange={(e) => store.setAppearance({ fillColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
            />
            <Input
              value={store.appearance.fillColor}
              onChange={(e) => store.setAppearance({ fillColor: e.target.value })}
              className="h-8 text-xs font-mono"
              placeholder="#000000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-medium">Label (optional)</Label>
          <Input
            value={store.appearance.overlayLabel}
            onChange={(e) => store.setAppearance({ overlayLabel: e.target.value })}
            placeholder="REDACTED"
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Text overlay on redacted areas
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-medium">Label Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={store.appearance.labelColor}
              onChange={(e) => store.setAppearance({ labelColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent p-0 disabled:opacity-50"
              disabled={!store.appearance.overlayLabel}
            />
            <Input
              value={store.appearance.labelColor}
              onChange={(e) => store.setAppearance({ labelColor: e.target.value })}
              className="h-8 text-xs font-mono disabled:opacity-50"
              placeholder="#FFFFFF"
              disabled={!store.appearance.overlayLabel}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[10px] font-medium text-muted-foreground mb-2">Preview</p>
          <div
            className="flex h-10 w-full items-center justify-center rounded-md text-[11px] font-medium shadow-sm"
            style={{
              backgroundColor: store.appearance.fillColor,
              color: store.appearance.labelColor,
            }}
          >
            {store.appearance.overlayLabel || "REDACTED"}
          </div>
        </div>
      </div>
    </div>
  )
}
