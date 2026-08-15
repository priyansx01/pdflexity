"use client";

import * as React from "react";
import { Minus, Square, X, Search } from "lucide-react";
import { windowControls } from "@/lib/desktop";
import { cn } from "@/lib/utils";

/**
 * Frameless TitleBar — replaces OS chrome so light/dark never mismatch.
 * The whole bar is a Tauri drag region; every interactive child opts out with
 * `data-tauri-drag-region="false"`.
 */
export function TitleBar({
  workspaceName = "PDFlexity",
  onOpenPalette,
}: {
  workspaceName?: string;
  onOpenPalette?: () => void;
}) {
  const [maximized, setMaximized] = React.useState(false);

  React.useEffect(() => {
    windowControls.isMaximized().then(setMaximized);
    let unlisten: (() => void) | undefined;
    windowControls
      .onResized(() => windowControls.isMaximized().then(setMaximized))
      .then((u) => (unlisten = u));
    return () => unlisten?.();
  }, []);

  const minimize = () => windowControls.minimize();
  const toggleMax = () => windowControls.toggleMaximize();
  const close = () => windowControls.close();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center justify-between border-b border-hairline bg-rail pl-3 pr-2"
    >
      {/* Left: brand + workspace name */}
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <span className="label-caps text-foreground/90">PDFLEXITY</span>
        <span className="h-3 w-px bg-hairline" aria-hidden />
        <span className="text-[12px] text-muted-foreground">{workspaceName}</span>
      </div>

      {/* Center-right: search pill */}
      <button
        type="button"
        onClick={onOpenPalette}
        data-tauri-drag-region="false"
        aria-label="Find a tool"
        className={cn(
          "group mr-1 flex items-center gap-2 rounded-md border border-hairline bg-surface px-2.5 py-1",
          "text-[12px] text-muted-foreground transition-colors hover:border-emerald/50 hover:text-foreground"
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Find a tool</span>
        <kbd className="rounded border border-hairline bg-surface-raised px-1.5 py-px font-sans text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Right: window controls */}
      <div className="flex items-center" data-tauri-drag-region="false">
        <CtrlButton label="Minimize" onClick={minimize}>
          <Minus className="h-3.5 w-3.5" />
        </CtrlButton>
        <CtrlButton label="Maximize" onClick={toggleMax}>
          {maximized ? (
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
              <rect x="2.5" y="3.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="4" y="2" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <Square className="h-3 w-3" />
          )}
        </CtrlButton>
        <CtrlButton label="Close" onClick={close} danger>
          <X className="h-3.5 w-3.5" />
        </CtrlButton>
      </div>
    </div>
  );
}

function CtrlButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors",
        danger ? "hover:bg-destructive hover:text-white" : "hover:bg-emerald hover:text-emerald-foreground"
      )}
    >
      {children}
    </button>
  );
}
