"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";

import { loadWorkspace, saveWorkspace } from "@/lib/persistence";
import { requestNotifyPermission } from "@/lib/desktop";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { TitleBar } from "./title-bar";
import { ToolRail } from "./tool-rail";
import { ToolHeader } from "./tool-header";
import { StatusStrip } from "./status-strip";
import { CommandPalette } from "./command-palette";
import { SettingsDialog } from "./settings-dialog";
import { CompletionToaster } from "./completion-toaster";
import { unlockAudio } from "@/lib/sound";
import { TOOLS, getToolByPath, type Tool } from "@/lib/tools";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tool = getToolByPath(pathname);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // ⌘K / Ctrl+K toggles the palette (preventDefault so it never reaches the
  // webview find bar). Ctrl+, / ⌘, opens Settings.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Unlock the notification-sound AudioContext on the first user gesture so the
  // completion chime can play later (autoplay policy).
  React.useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Ask once for OS notification permission (used when minimized to tray).
  React.useEffect(() => {
    requestNotifyPermission();
  }, []);

  // Restore any disk-persisted work once on launch.
  React.useEffect(() => {
    loadWorkspace()
      .then((restored) => {
        if (Object.keys(restored).length) useWorkspaceStore.getState().hydrate(restored);
      })
      .catch(() => {});
  }, []);

  // Real quit goes through here (tray "Quit" emits `app:quit-requested`): confirm
  // when work is loaded, persist it, then exit. Closing the window only hides it.
  React.useEffect(() => {
    const un = listen("app:quit-requested", async () => {
      const { sessions, busy } = useWorkspaceStore.getState();
      const hasWork = Object.values(sessions).some((s) => s.files.length > 0) || busy;
      if (hasWork) {
        const ok = await ask(
          `You have files loaded${busy ? " and a job running" : ""}. Quit PDFlexity? Your work will be restored next time.`,
          { title: "Quit PDFlexity", kind: "warning" }
        );
        if (!ok) return;
      }
      await saveWorkspace(sessions);
      await invoke("quit_app");
    });
    return () => {
      un.then((f) => f()).catch(() => {});
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar workspaceName={tool?.name ?? "PDFlexity"} onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <ToolRail
          tools={TOOLS}
          activeId={tool?.id ?? null}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ToolHeader tool={tool} />
          <main className="hairline-grid min-h-0 flex-1 overflow-y-auto">{children}</main>
          <StatusStrip tool={tool} />
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CompletionToaster />
    </div>
    </MotionConfig>
  );
}

export type { Tool };
