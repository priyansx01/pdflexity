# Build a self-contained OCR worker bundle (Windows / PowerShell).
#
# Requirements: Python 3.11 or 3.12 (PaddlePaddle has no 3.13/3.14 wheels),
# with services/ocr-engine/requirements.txt + pyinstaller installed.
#
# Output: ../../src-tauri/resources/ocr/pdflexity-ocr-worker.exe (+ deps)
$ErrorActionPreference = "Stop"

Write-Host "==> Building pdflexity-ocr-worker with PyInstaller (--onedir)" -ForegroundColor Cyan

pyinstaller `
  --noconfirm `
  --onedir `
  --name pdflexity-ocr-worker `
  --distpath ../../src-tauri/resources/ocr `
  --workpath .build `
  --specpath .build `
  --hidden-import paddleocr `
  --hidden-import paddle `
  --collect-all paddleocr `
  --collect-all paddle `
  --collect-all fitz `
  --collect-all docx `
  --collect-all numpy `
  ocr_worker.py

Write-Host "==> Done. Bundle at ../../src-tauri/resources/ocr/pdflexity-ocr-worker.exe" -ForegroundColor Green
Write-Host "    Add \"resources/ocr/*\" to src-tauri/tauri.conf.json bundle.resources." -ForegroundColor Yellow
