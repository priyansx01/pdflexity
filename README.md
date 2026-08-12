<div align="center">

# 📄 pdflexity

**A fast, privacy-first PDF toolkit that runs entirely on your machine.**

No uploads. No servers. No tracking. Your documents never leave your device.

[Features](#-features) · [Architecture](#-architecture) · [Getting started](#-getting-started) · [Contributing](#-contributing)

</div>

---

## ✨ Overview

Most online PDF tools require uploading sensitive documents to remote servers —
introducing privacy risk, latency, and file-size limits. **pdflexity** does every
operation **locally**, powered by a dedicated **Go** engine for CPU-efficient PDF
processing, wrapped in a premium native desktop shell built with **Tauri + Rust**.

> Built for speed. Designed for privacy. Powered by Go.

## 🧩 Features

- 📎 **Merge** — combine PDFs into one, drag-to-reorder
- ✂️ **Split** — extract pages or ranges into one or many files
- 🔀 **Organize** — reorder pages
- 🔓 **Unlock / 🔒 Protect** — remove or add AES-256 password protection
- ✍️ **Sign / Verify** — PKCS#12 digital signatures with visual stamp
- 📊 **Compare** — visual + text diff between two documents
- 🖤 **Redact** — permanently burn out text/regions (search & mark)
- 🔍 **OCR** — make scanned PDFs searchable & editable (PaddleOCR)

Everything runs offline. The renderer never touches the filesystem directly —
all file operations go through a secure Tauri command layer to the Go engine.

## 🏗️ Architecture

```
React UI (Next.js, Graphite & Ember design system)
      ↓  invoke() / events
Tauri Rust backend  (src-tauri)
      ↓  JSON over stdin/stdout
Go engine  (pdflexity-engine, pdfcpu)
      ↓  (OCR only)
Python worker  (PaddleOCR + PyMuPDF)
```

- **Renderer never touches the disk** — every operation is a typed Tauri command.
- The **Go engine** runs as a long-lived child process speaking a one-line-JSON
  protocol (one-shot for most ops, streaming for OCR).
- **Tools are data**: a single `lib/tools.ts` registry drives the canvas
  (`Document → Options → Run → Result`); adding a simple tool is one record.

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| Renderer | Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui, Framer Motion (`motion`), Zustand |
| Desktop | Tauri v2, Rust |
| Engine | Go, [`pdfcpu`](https://github.com/pdfcpu/pdfcpu) |
| OCR | Python, PaddleOCR, PyMuPDF |

## 📦 Getting started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18 and [pnpm](https://pnpm.io) ≥ 8
- [Rust](https://rustup.rs) (stable) — for the Tauri backend
- WebView2 runtime (preinstalled on Windows 10/11)
- _Optional:_ [Go](https://go.dev) — only if you'll modify the engine

### Install & run

```bash
pnpm install
pnpm dev          # starts the Next.js renderer + the Tauri window
```

### Build a distributable

```bash
pnpm tauri:build   # produces an installer (MSI/NSIS on Windows, DMG on macOS, etc.)
```

### Rebuild the Go engine (only if you change it)

```bash
cd services/pdf-engine
go build -o ../../src-tauri/bin/pdflexity-engine.exe ./cmd/pdflexity-engine/
```

A prebuilt Windows binary ships under `src-tauri/bin/` so you can run & develop
without Go installed.

## 📁 Project structure

```
pdflexity/
├─ apps/renderer/          # Next.js app — the desktop UI
│  └─ src/
│     ├─ components/shell/   # TitleBar, ToolRail, ToolHeader, StatusStrip, palette
│     ├─ components/canvas/  # WorkCanvas state machine + option primitives
│     ├─ lib/                # tool registry, motion, file I/O, pdf helpers
│     └─ stores/             # Zustand stores
├─ services/
│  ├─ pdf-engine/          # Go engine (pdfcpu)
│  └─ ocr-engine/          # Python OCR worker (+ PyInstaller bundling scripts)
└─ src-tauri/              # Rust backend, Tauri config, capabilities
```

## 🗺️ Roadmap

- [ ] Bundle the OCR worker for distribution (PyInstaller; see
  `services/ocr-engine/BUNDLING.md`) — currently OCR needs Python + PaddleOCR
  installed locally.
- [ ] Wire **Compress** / **Repair** to engine operations.
- [ ] Auto-update via `tauri-plugin-updater` (signing key + release feed).
- [ ] Deeper restyle of the bespoke complex-tool canvases to the design system.

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss a change first, then:

1. Fork → feature branch → commit with [Conventional Commits](https://www.conventionalcommits.org)
2. Keep the privacy guarantee: **no network calls for document processing**
3. Run `pnpm typecheck` and exercise the affected tool before opening a PR

## 🔒 Privacy

pdflexity makes **no external API calls for processing**. Documents are read,
transformed, and written on your own machine. The only network traffic is the
app checking for updates (when enabled) and the OCR engine's first-run model
download (PaddleOCR).

## 📄 License

MIT © Priyansh
