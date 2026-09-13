# Build a self-contained OCR worker bundle (Windows / PowerShell).
#
# Requirements: Python 3.11 (see BUNDLING.md — paddlex pins pandas<=1.5.3, which
# has no cp312 wheel), with services/ocr-engine/requirements.txt + pyinstaller
# installed in the active environment.
#
# Output: ../../src-tauri/resources/ocr/pdflexity-ocr-worker/ (+ deps)
$ErrorActionPreference = "Stop"

Write-Host "==> Building pdflexity-ocr-worker with PyInstaller (--onedir)" -ForegroundColor Cyan

# Bundle .dist-info metadata for every installed distribution (small, and some
# packages resolve versions at runtime via importlib.metadata). Generated
# dynamically so the script stays reproducible.
$names = & python -c "import importlib.metadata as m; print('\n'.join(sorted({d.metadata['Name'] for d in m.distributions() if d.metadata['Name']})))"
$metaArgs = @()
foreach ($n in ($names -split "`r?`n" | Where-Object { $_ })) { $metaArgs += "--copy-metadata"; $metaArgs += $n.Trim() }
Write-Host "==> Bundling metadata for $($metaArgs.Count / 2) distributions" -ForegroundColor Cyan

$args = @(
  "--noconfirm", "--onedir", "--name", "pdflexity-ocr-worker",
  "--distpath", "../../src-tauri/resources/ocr", "--workpath", ".build", "--specpath", ".build",
  "--collect-all", "rapidocr_onnxruntime", "--collect-all", "onnxruntime",
  "--collect-all", "fitz", "--collect-all", "cv2", "--collect-all", "docx", "--collect-all", "numpy"
) + $metaArgs + @("ocr_worker.py")

pyinstaller @args

Write-Host "==> Done. Bundle at ../../src-tauri/resources/ocr/pdflexity-ocr-worker" -ForegroundColor Green
Write-Host "    (models download on first run to ~/.paddlex — not bundled)" -ForegroundColor Yellow
