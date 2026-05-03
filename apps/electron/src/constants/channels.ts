// ─── IPC Channel Name Constants ───────────────────────────────────────────────
// Single source of truth — used in both preload and ipc handlers.

export const Channels = {
  // App
  APP_GET_PLATFORM:  "app:get-platform",
  APP_GET_VERSION:   "app:get-version",
  // Shell
  SHELL_OPEN_EXTERNAL: "shell:open-external",
  // PDF operations
  PDF_UNLOCK:  "pdf:unlock",
  PDF_PROTECT: "pdf:protect",
  PDF_COMPARE: "pdf:compare",
} as const

export type ChannelName = (typeof Channels)[keyof typeof Channels]
