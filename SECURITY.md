# Security Policy

pdflexity is designed to run **entirely on your machine** — documents are never
uploaded to a server. All processing happens locally through the Rust command
layer and the bundled Go/Python engines.

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**. Instead,
email the maintainers with:

- a description of the issue and its impact,
- steps to reproduce (a proof-of-concept if possible),
- the affected version / commit.

We aim to acknowledge reports within a few days and to ship a fix as quickly as
the severity warrants.

## Scope & hardening notes

- **Content-Security-Policy:** the webview ships with a restrictive CSP
  (`src-tauri/tauri.conf.json`). When adding features, avoid `unsafe-eval` and do
  not render untrusted document text as HTML.
- **Filesystem access:** file reads/writes go through user-driven native dialogs.
  The `fs` capability scope in `src-tauri/capabilities/default.json` should be
  kept as narrow as the feature set allows.
- **Engine boundary:** the Rust ↔ Go protocol passes arguments as structured
  JSON / argv arrays (never a shell string), so there is no shell-injection
  surface. Keep it that way.
