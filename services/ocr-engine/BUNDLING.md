# OCR Engine — Bundling for Tauri (Phase A)

The OCR pipeline is orchestrated by the **Go engine**, which spawns a **Python**
worker (`ocr_worker.py`, RapidOCR/ONNX Runtime + PyMuPDF) and streams JSON
events. In development the worker runs from the system Python; for production
distribution it is bundled as a self-contained executable and published as a
GitHub release asset the app downloads on demand.

The worker uses **RapidOCR (ONNX Runtime)** — it runs the same PP-OCR
detection/recognition models as PaddleOCR but is ~3x faster per page, far
lighter (no PaddlePaddle runtime), and much simpler to bundle. (It replaced a
PaddleOCR worker that was large, slow, and painful to freeze.)

## Architecture

```
Tauri app
  └─ pdflexity-engine (Go binary, resource)
       └─ spawns  pdflexity-ocr-worker(.exe)   ← PyInstaller bundle (release asset)
             └─ RapidOCR (onnxruntime) / PyMuPDF / numpy / python-docx
```

## ⚠️ Environment requirements

- **Python 3.11** (what the CI + release pack use; 3.12 also works for RapidOCR).
  ```bash
  python --version
  ```
- **~1 GB free** for the venv + PyInstaller output (pack is ~300 MB, ~127 MB
  zipped).
- **PyInstaller** (`pip install pyinstaller`).
- OCR models are **not bundled** — RapidOCR ships small ONNX models with the
  package, so they're inside the pack; nothing downloads at runtime.

> The dev machine used for this migration runs Python 3.14, so the bundle could
> not be built here. Build it on a machine (or CI image) with Python 3.12.

## Build (once, on a Python 3.11/3.12 machine)

```bash
cd services/ocr-engine
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
pip install pyinstaller

# Produces ../../src-tauri/resources/ocr/pdflexity-ocr-worker(.exe) + deps
./build.ps1        # Windows
# or: bash build.sh   # macOS/Linux
```

## Wiring into the Tauri bundle

After the build, add the OCR bundle to `src-tauri/tauri.conf.json` `bundle.resources`:

```jsonc
"resources": [
  "bin/*",
  "resources/ocr/*"      // ← add this once the bundle is built
]
```

(Left out by default so `tauri build` doesn't fail when the folder is absent.)

## Required Go engine patch (small, additive)

The Go engine currently runs the worker as `python ocr_worker.py …`. The
**bundled** worker is a standalone executable with no Python/script needed, so
the engine must learn to launch it directly when present. Add to
`services/pdf-engine/internal/handler/ocr.go` (`findPython` / `findOCRScript`):

```go
// If a bundled worker executable sits next to the engine binary, use it
// directly instead of `python ocr_worker.py`.
func findBundledWorker() (string, bool) {
    exe, err := os.Executable()
    if err != nil {
        return "", false
    }
    dir := filepath.Dir(exe)
    candidates := []string{
        filepath.Join(dir, "pdflexity-ocr-worker.exe"), // Windows
        filepath.Join(dir, "pdflexity-ocr-worker"),     // macOS/Linux
        filepath.Join(dir, "..", "resources", "ocr", "pdflexity-ocr-worker.exe"),
        filepath.Join(dir, "..", "resources", "ocr", "pdflexity-ocr-worker"),
    }
    for _, c := range candidates {
        if _, err := os.Stat(c); err == nil {
            return c, true
        }
    }
    return "", false
}
```

Then in `handleOCRStart` / `handleOCRRenderPage` / `handleOCRExport`:

```go
if worker, ok := findBundledWorker(); ok {
    // Run the bundled exe directly (drop the leading "pythonPath scriptPath").
    proc := exec.Command(worker, argsWithoutScript...)
    // …same piping as today
} else {
    // Existing path: python + ocr_worker.py
}
```

Rebuild the engine:

```bash
cd services/pdf-engine
go build -o ../../src-tauri/bin/pdflexity-engine(.exe) ./cmd/pdflexity-engine/
```

> This is the **only** change to the Go engine in the whole migration. It is
> additive (dev path unchanged) and couldn't be compiled here because Go isn't
> installed on this machine.

## Dev usage (no bundle needed)

In development, OCR works if the system Python has the deps:

```bash
pip install -r services/ocr-engine/requirements.txt   # on Python 3.11/3.12
```

The Go engine's `findPython()` / `findOCRScript()` locate them automatically.
