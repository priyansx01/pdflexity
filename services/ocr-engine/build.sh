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

# paddlex checks its optional-dependency "extras" at runtime via
# importlib.metadata (require_extra), so the .dist-info metadata for EVERY
# installed package must be bundled or OCR init fails. Generate --copy-metadata
# for all installed distributions.
META=$(python -c "import importlib.metadata as m; print(' '.join('--copy-metadata '+n for n in sorted({d.metadata['Name'] for d in m.distributions() if d.metadata['Name']})))")

pyinstaller \
  --noconfirm \
  --onedir \
  --name pdflexity-ocr-worker \
  --distpath ../../src-tauri/resources/ocr \
  --workpath .build \
  --specpath .build \
  --hidden-import paddleocr \
  --hidden-import paddle \
  --hidden-import paddlex \
  --collect-all paddleocr \
  --collect-all paddle \
  --collect-all paddlex \
  --collect-all fitz \
  --collect-all docx \
  --collect-all numpy \
  $META \
  ocr_worker.py

echo "==> Done. Bundle at ../../src-tauri/resources/ocr/pdflexity-ocr-worker"
echo "    (models download on first run to ~/.paddlex — not bundled)"
