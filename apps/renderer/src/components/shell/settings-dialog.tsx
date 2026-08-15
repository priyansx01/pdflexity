"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { FolderOpen, RotateCcw, ShieldCheck } from "lucide-react";
import { pickDirectory } from "@/lib/desktop";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Settings — the app's second floating layer (same anatomy as the ⌘K palette:
 * scrim + shadow-float + hairline border). Sections: Appearance, Storage, About.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const defaultSaveDir = useSettings((s) => s.defaultSaveDir);
  const setDefaultSaveDir = useSettings((s) => s.setDefaultSaveDir);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!open) return null;

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false);
      }}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-(--shadow-float)"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-[14px] font-semibold">Settings</h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => onOpenChange(false)}
            className="rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-surface-raised hover:text-foreground"
          >
            Esc
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* ── Appearance ── */}
          <p className="label-caps px-2 pb-1.5 pt-2">Appearance</p>
          <div className="flex items-center justify-between rounded-lg px-2 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">Theme</p>
              <p className="text-[11px] text-muted-foreground">
                Designed dark by default; light is tuned separately.
              </p>
            </div>
            <SegmentedTheme isDark={isDark} onSet={(d) => setTheme(d ? "dark" : "light")} />
          </div>

          {/* ── Storage ── */}
          <p className="label-caps px-2 pb-1.5 pt-4">Storage</p>
          <div className="rounded-lg px-2 py-2.5">
            <p className="text-[13px] font-medium">Where to store PDF files</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Save dialogs start here. You can always pick another folder per file.
            </p>
            <div className="flex items-center gap-2">
              <div
                className="min-w-0 flex-1 truncate rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-[12px] text-muted-foreground"
                title={defaultSaveDir ?? undefined}
              >
                {defaultSaveDir ?? "Ask every time (OS default)"}
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[12px] hover:bg-surface-raised"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Browse…
              </button>
            </div>
            {defaultSaveDir && (
              <button
                type="button"
                onClick={() => setDefaultSaveDir(null)}
                className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Use default (ask each time)
              </button>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald" />
              PDFs are never written without the save dialog.
            </p>
          </div>

          {/* ── About ── */}
          <p className="label-caps px-2 pb-1.5 pt-4">About</p>
          <div className="space-y-1 rounded-lg px-2 py-2.5 text-[12px] text-muted-foreground">
            <p>
              PDFlexity <span className="text-foreground/80">1.0.0</span>
            </p>
            <p>
              Engine <span className="text-foreground/80">pdfcpu · Local</span>
            </p>
            <p>Everything runs on your device. No uploads, ever.</p>
          </div>
        </div>
      </div>
    </div>
  );

  async function handleBrowse(): Promise<void> {
    try {
      const dir = await pickDirectory();
      if (dir) setDefaultSaveDir(dir);
    } catch {
      /* user cancelled or picker failed — keep current setting */
    }
  }
}

function SegmentedTheme({ isDark, onSet }: { isDark: boolean; onSet: (dark: boolean) => void }) {
  const choices: { label: string; value: boolean }[] = [
    { label: "Light", value: false },
    { label: "Dark", value: true },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="relative flex shrink-0 rounded-md border border-hairline bg-surface-raised p-0.5">
      {choices.map((c) => {
        const active = c.value === isDark;
        return (
          <button
            key={c.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSet(c.value)}
            className={cn(
              "relative rounded-[5px] px-2.5 py-1 text-[12px] transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && <span className="absolute inset-0 rounded-[5px] bg-emerald/20" />}
            <span className="relative">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
