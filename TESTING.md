# Testing — pdflexity-tauri

## Automated (run anytime)

```bash
cd src-tauri
cargo test --lib        # 9 unit tests: contract serialization, base64, temp I/O
```

What's covered automatically:

| Layer | Test | Asserts |
|-------|------|---------|
| Rust→Go contract | `command_serializes_to_go_camel_case_keys` | `Command` JSON keys match Go's `json:"camelCase"` tags (the #1 integration risk) |
| Rust→Go contract | `merge_command_uses_input_paths_array` | merge op shape (`inputPaths[]`) |
| Go→Rust contract | `response_deserializes_go_output` | `Response` parses engine output |
| Streaming | `ocr_event_terminal_detection` | complete/error terminate the stream |
| Encoding | `base64_round_trips_arbitrary_bytes` | encode/decode (incl. 4 KB payload) |
| FS | `temp_dir_is_created_and_cleaned` | make/write/read/cleanup |
| DTO | `ok_file_result_shape`, `error_result_shape`, `split_multiple_shape` | `OpResult` JSON matches `electron-env.d.ts` unions |

Engine protocol (validate the binary directly):

```bash
printf '{"op":"__test__"}\n' | ./src-tauri/bin/pdflexity-engine.exe
# → {"success":false,"error":"unknown operation: \"__test__\""}
```

> `tests/engine_protocol.rs` is a fuller version but is `#[ignore]`d — Windows
> Application Control blocks the separate test binary on this dev machine. Run
> with `cargo test -- --ignored` where the policy isn't enforced.

## Manual GUI matrix

Run `pnpm dev`, then exercise each feature. Each should produce a correct,
openable file identical to the Electron build's output.

| Feature | Route | Steps | Expected |
|---------|-------|-------|----------|
| Merge | `/organize/merge` | Add ≥2 PDFs → Merge | `*_merged.pdf` downloads, valid |
| Organize | `/organize/organize` | Add PDFs → reorder → apply | Reordered PDF downloads |
| Split (range) | `/organize/split` | Pick PDF → range mode → 1-3,5 → Split | Single `split_*.pdf` (mergeOutput) |
| Split (pages) | `/organize/split` | pages mode → select pages | Multiple `*.pdf` downloads |
| Unlock | `/security/unlock` | Add encrypted PDF + password | `*_unlocked.pdf` downloads |
| Protect | `/security/protect` | Add PDF + password | `*_protected.pdf` (re-locks) |
| Compare | `/security/compare` | Add 2 PDFs | Diff rendered |
| Sign / Verify | `/security/sign` | Pick cert (.pfx) + passphrase → sign | `signed_*.pdf`; Verify shows cert info |
| Redact | `/security/redact` | Add PDF → search → mark → Apply | `redacted_*.pdf`, marks burnt in |
| OCR | `/optimize/ocr` | Add PDF → Start | Progress events stream; page results render; export (json/docx/pdf) works |

### Cross-check against the Electron build

For byte-level parity, run the same input through both builds and diff:

```bash
# produce with tauri build
sha256sum merged_tauri.pdf merged_electron.pdf   # should match (deterministic)
```

## Environment constraints (this dev machine)

- **No Go** — engine binary reused as-is; rebuild only on a Go machine.
- **Python 3.14** — PaddlePaddle has no 3.14 wheel, so the OCR bundle can't be
  built here (use 3.11/3.12; see `services/ocr-engine/BUNDLING.md`).
- **Windows Application Control** — blocks freshly-built standalone test/example
  binaries; in-process `cargo test --lib` works fine.
