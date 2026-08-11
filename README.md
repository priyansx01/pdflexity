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

See the migration plan in the source repo. Phases:
- [x] Scaffold repo
- [ ] Tauri init + Rust backend
- [ ] Port GoBridge to Rust
- [ ] Port IPC handlers
- [ ] Frontend adapter (electronAPI → tauri)
- [ ] OCR/Python bundling
- [ ] Packaging + auto-update

License: MIT
