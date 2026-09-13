#!/usr/bin/env bash
# Build a self-contained OCR worker bundle (macOS / Linux).
#
# Requirements: Python 3.11 (see BUNDLING.md — paddlex pins pandas<=1.5.3, which
# has no cp312 wheel), with services/ocr-engine/requirements.txt + pyinstaller
# installed in the active environment.
#
# Output: ../../src-tauri/resources/ocr/pdflexity-ocr-worker (+ deps)
set -euo pipefail

echo "==> Building pdflexity-ocr-worker with PyInstaller (--onedir)"

# Bundle .dist-info metadata for every installed distribution (small, and some
# packages resolve versions at runtime via importlib.metadata). Generated
# dynamically so the script stays reproducible.
META=$(python -c "import importlib.metadata as m; print(' '.join('--copy-metadata '+n for n in sorted({d.metadata['Name'] for d in m.distributions() if d.metadata['Name']})))")

pyinstaller \
  --noconfirm \
  --onedir \
  --name pdflexity-ocr-worker \
  --distpath ../../src-tauri/resources/ocr \
  --workpath .build \
  --specpath .build \
  --collect-all rapidocr_onnxruntime \
  --collect-all onnxruntime \
  --collect-all fitz \
  --collect-all cv2 \
  --collect-all docx \
  --collect-all numpy \
  $META \
  ocr_worker.py

echo "==> Done. Bundle at ../../src-tauri/resources/ocr/pdflexity-ocr-worker"
echo "    (models download on first run to ~/.paddlex — not bundled)"
