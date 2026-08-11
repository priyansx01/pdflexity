#!/usr/bin/env bash
# Build a self-contained OCR worker bundle (macOS / Linux).
#
# Requirements: Python 3.11 or 3.12 (PaddlePaddle has no 3.13/3.14 wheels),
# with services/ocr-engine/requirements.txt + pyinstaller installed.
#
# Output: ../../src-tauri/resources/ocr/pdflexity-ocr-worker (+ deps)
set -euo pipefail

echo "==> Building pdflexity-ocr-worker with PyInstaller (--onedir)"

pyinstaller \
  --noconfirm \
  --onedir \
  --name pdflexity-ocr-worker \
  --distpath ../../src-tauri/resources/ocr \
  --workpath .build \
  --specpath .build \
  --hidden-import paddleocr \
  --hidden-import paddle \
  --collect-all paddleocr \
  --collect-all paddle \
  --collect-all fitz \
  --collect-all docx \
  --collect-all numpy \
  ocr_worker.py

echo "==> Done. Bundle at ../../src-tauri/resources/ocr/pdflexity-ocr-worker"
echo "    Add \"resources/ocr/*\" to src-tauri/tauri.conf.json bundle.resources."
