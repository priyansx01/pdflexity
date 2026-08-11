# 📄 pdflexity-tauri

Tauri (Rust) port of [pdflexity](../pdflexity) — a fast, privacy-first PDF toolkit.

> Same privacy-first local processing, same Go engine, same React UI — **Electron
> replaced by Tauri** for a dramatically smaller, native binary.

## 🧱 Architecture

```
React UI (Next.js static export)        ← reused unchanged from pdflexity
        ↓  invoke() / events
Tauri Rust backend (src-tauri/)         ← NEW (replaces Electron main/preload)
        ↓  JSON over stdin/stdout
Go engine (pdflexity-engine)            ← reused unchanged (pdfcpu)
        ↓  (OCR only)
Python ocr_worker.py (PaddleOCR)        ← reused; bundled later via PyInstaller
```

- **Renderer never touches the filesystem** — all ops go through Rust `#[tauri::command]`.
- The **Go engine binary** is spawned as a long-running child process; commands are
  one JSON object per line over stdin, responses over stdout (streaming for OCR).
- Frontend talks to the backend through a thin adapter (`lib/backend.ts`) that mimics
  the old `window.electronAPI` shape but routes to Tauri `invoke()`/`listen()`.

## 📦 Layout

| Path | Purpose |
|------|---------|
| `apps/renderer/` | Next.js app (App Router) — copied from pdflexity |
| `services/pdf-engine/` | Go engine source (`pdfcpu`) — copied unchanged |
| `services/ocr-engine/` | Python OCR worker — copied for later bundling |
| `src-tauri/` | Rust backend + Tauri config |
| `src-tauri/bin/` | Prebuilt Go engine binary (dev) |

## 🚀 Getting started

```bash
pnpm install              # install renderer deps + @tauri-apps/cli
pnpm tauri:dev            # run Next.js (:3100) + Tauri window
pnpm tauri:build          # produce a distributable
```

### Build the Go engine (only if you change it)

```bash
cd services/pdf-engine
go build -o ../../src-tauri/bin/pdflexity-engine.exe ./cmd/pdflexity-engine/
```

A prebuilt Windows binary is committed under `src-tauri/bin/`.

## 🗺️ Migration status

- [x] Scaffold repo
- [x] Tauri init + Rust backend
- [x] Port GoBridge to Rust
- [x] Port IPC handlers (19 commands)
- [x] Frontend adapter (electronAPI → tauri)
- [x] Native menu (Edit/View/Help) + window polish
- [x] Engine resource bundling (dev=prod path)
- [ ] OCR/Python bundling (blocked: needs Python 3.11/3.12; see `services/ocr-engine/BUNDLING.md`)
- [ ] Auto-update wiring (needs signing key + release feed)
- [ ] Drag region + external-link polish (frontend `data-tauri-drag-region`)

## 🔌 Window / menu / auto-update (Step 14 notes)

**Done:** native menu (`src-tauri/src/menu.rs`), dark window background,
show-after-init to avoid white flash (`visible:false` + `show()` in setup),
and the `open_external` command (opens http/https in the default browser).

**Follow-ups (need infrastructure):**

- **Auto-updater** — add `tauri-plugin-updater`, generate a signing keypair
  (`tauri signer generate -w ~/.tauri/pdflexity.key`), set `TAURI_SIGNING_PRIVATE_KEY`
  at build time, add `plugins.updater` (pubkey + endpoints) to `tauri.conf.json`,
  publish a `latest.json` manifest per release, and call the updater from the
  frontend (`@tauri-apps/plugin-updater`).
- **Drag region** — the UI uses Electron's CSS `-webkit-app-region: drag`
  (`.app-drag`). In Tauri, replace with the `data-tauri-drag-region` attribute on
  the same elements (or use a borderless `titleBarStyle: Overlay` window).
- **External links** — arbitrary `<a target="_blank">` clicks should route through
  `openExternal`; add a frontend click handler, or build the window in code with
  `WebviewWindowBuilder::on_navigation` to deny + delegate http(s) URLs.

License: MIT
