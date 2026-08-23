# Contributing to pdflexity

Thanks for your interest in improving pdflexity! This is a privacy-first, fully
local PDF toolkit built with **Tauri + Rust**, a **Go** PDF engine (pdfcpu), and
a **Next.js / React** renderer.

## Project layout

```
apps/renderer        Next.js 16 / React 19 UI (App Router)
  src/app            Thin route entry points
  src/features       Feature implementations (components, hooks, stores)
  src/lib            Shared adapters — desktop.ts (Tauri), pdf.ts (pdf.js), backend.ts
src-tauri            Rust shell + typed commands (invoke handlers)
services/pdf-engine  Go engine — newline-delimited JSON over stdin/stdout
services/ocr-engine  Python PaddleOCR worker (spawned by the Go engine)
```

The renderer talks to Rust via `invoke()` and events; Rust drives the Go engine
over a stdin/stdout JSON protocol (see `src-tauri/src/go_bridge.rs`).

## Prerequisites

- Node.js ≥ 18 and pnpm ≥ 8
- Rust (stable) + the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- Go ≥ 1.22 (to build the PDF engine)
- Python 3.8+ with PaddleOCR (only for the OCR feature)

## Getting started

```bash
pnpm install
# Build the Go engine once (see README for the exact path):
cd services/pdf-engine && go build -o ../../src-tauri/bin/pdflexity-engine ./cmd/pdflexity-engine/
cd ../.. && pnpm dev            # launches Tauri + the renderer dev server
```

## Before opening a PR

Run the same checks CI runs:

```bash
pnpm --filter renderer lint
pnpm --filter renderer typecheck     # see note below
pnpm --filter renderer build
cd src-tauri && cargo test
cd services/pdf-engine && go build ./... && go vet ./... && go test ./...
```

`lib/backend-types.ts` is the single source of truth for the Rust/Go engine's
JSON return shapes — keep it in sync with `src-tauri/src/commands/*` and the Go
handlers when you change an engine response.

## Commit style

Conventional-commit prefixes are used throughout the history:
`feat(scope):`, `fix(scope):`, `refactor(scope):`, `polish(scope):`.

## Code style

- TypeScript runs in `strict` mode — no `any`. Prefer the shared adapters in
  `src/lib` over importing Tauri plugins directly.
- Format with `pnpm --filter renderer format` (Prettier) and `cargo fmt` / `gofmt`.

By contributing you agree that your contributions are licensed under the MIT
License (see [LICENSE](LICENSE)).
