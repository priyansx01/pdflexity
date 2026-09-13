//! Optional feature packs (VS Code-extension style). Currently just OCR: a
//! self-contained PaddleOCR worker, prebuilt by CI and published as a GitHub
//! release asset, downloaded on demand into the app-data `features/` folder.
//!
//! The download happens here in Rust (reqwest) so it bypasses the webview CSP
//! and the fs-plugin scope, and streams progress to the frontend as
//! `feature:install-progress` events.

use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

use crate::result::OpResult;

// ─── Pack descriptor (wired to the CI-published, per-platform release) ─────────

const OCR_PACK_VERSION: &str = "v1";
const OCR_PACK_TAG: &str = "ocr-pack-v1";
const OCR_PACK_RELEASE_BASE: &str =
    "https://github.com/priyansx01/pdflexity/releases/download";

/// The platform-specific pack zip filename produced by the ocr-pack CI matrix.
/// Returns None on an unsupported platform.
const fn ocr_pack_asset() -> Option<&'static str> {
    if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        Some("pdflexity-ocr-worker-win-x64.zip")
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        Some("pdflexity-ocr-worker-macos-x64.zip")
    } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        Some("pdflexity-ocr-worker-linux-x64.zip")
    } else {
        None
    }
}

/// Lowercase hex SHA-256 of the platform pack. Empty = skip verification (fill
/// these in from the CI-published `.sha256` files once the release exists).
const fn ocr_pack_sha256() -> &'static str {
    if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        "6762b923414c630b4d65977d97fd5b6ebead26dac9c77ec09c2d08340556051a"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        ""
    } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        ""
    } else {
        ""
    }
}

/// The onedir folder name PyInstaller produces (see services/ocr-engine/build.ps1).
const OCR_WORKER_DIR: &str = "pdflexity-ocr-worker";

// ─── Paths ────────────────────────────────────────────────────────────────────

fn feature_dir(app: &AppHandle, id: &str) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("features").join(id))
}

/// The installed OCR worker executable, if present. Used by the OCR commands to
/// point the Go engine at the bundled worker.
pub fn ocr_worker_path(app: &AppHandle) -> Option<PathBuf> {
    let base = feature_dir(app, "ocr")?;
    let worker = base.join(OCR_WORKER_DIR);
    for name in ["pdflexity-ocr-worker.exe", "pdflexity-ocr-worker"] {
        let p = worker.join(name);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

// ─── Commands ──────────────────────────────────────────────────────────────────

/// Whether a feature is installed, and its recorded version vs. the expected one.
#[tauri::command(rename_all = "camelCase")]
pub fn feature_status(id: String, app: AppHandle) -> Value {
    if id != "ocr" {
        return json!({ "installed": false, "expectedVersion": OCR_PACK_VERSION });
    }
    let installed = ocr_worker_path(&app).is_some();
    let version = feature_dir(&app, "ocr")
        .and_then(|b| std::fs::read_to_string(b.join("VERSION")).ok())
        .map(|s| s.trim().to_string());
    json!({
        "installed": installed,
        "available": ocr_pack_asset().is_some(),
        "version": version,
        "expectedVersion": OCR_PACK_VERSION,
    })
}

/// Download + verify + extract the OCR feature pack into app-data. Streams
/// `feature:install-progress` events and resolves when done.
#[tauri::command(rename_all = "camelCase")]
pub async fn feature_install(id: String, app: AppHandle) -> OpResult {
    if id != "ocr" {
        return OpResult::err("Unknown feature");
    }
    match install_ocr(&app).await {
        Ok(()) => OpResult::ok(Value::Null),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

/// Remove an installed feature pack.
#[tauri::command(rename_all = "camelCase")]
pub async fn feature_uninstall(id: String, app: AppHandle) -> OpResult {
    if id != "ocr" {
        return OpResult::err("Unknown feature");
    }
    if let Some(base) = feature_dir(&app, "ocr") {
        let _ = tokio::fs::remove_dir_all(&base).await;
    }
    OpResult::ok(Value::Null)
}

// ─── Install pipeline ───────────────────────────────────────────────────────────

async fn install_ocr(app: &AppHandle) -> Result<()> {
    let asset = ocr_pack_asset()
        .ok_or_else(|| anyhow!("OCR isn't available for this platform yet."))?;
    let url = format!("{OCR_PACK_RELEASE_BASE}/{OCR_PACK_TAG}/{asset}");

    let base = feature_dir(app, "ocr").ok_or_else(|| anyhow!("no app-data directory"))?;
    tokio::fs::create_dir_all(&base)
        .await
        .with_context(|| format!("create {}", base.display()))?;
    let zip_path = base.join("download.zip");

    // ── Download (streamed, with progress + running hash) ───────────────────
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .context("start download")?
        .error_for_status()
        .context("download request failed")?;
    let total = resp.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&zip_path)
        .await
        .context("create download file")?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_pct: u8 = 255;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("download stream")?;
        hasher.update(&chunk);
        file.write_all(&chunk).await.context("write download")?;
        downloaded += chunk.len() as u64;
        let pct = if total > 0 {
            ((downloaded.saturating_mul(100)) / total) as u8
        } else {
            0
        };
        if pct != last_pct {
            last_pct = pct;
            let _ = app.emit(
                "feature:install-progress",
                json!({ "id": "ocr", "phase": "download", "pct": pct }),
            );
        }
    }
    file.flush().await.ok();
    drop(file);

    // ── Verify checksum (when configured) ───────────────────────────────────
    let expected_sha = ocr_pack_sha256();
    if !expected_sha.is_empty() {
        let digest = hasher.finalize();
        let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
        if !hex.eq_ignore_ascii_case(expected_sha) {
            let _ = tokio::fs::remove_file(&zip_path).await;
            anyhow::bail!("Downloaded pack failed its checksum — please retry.");
        }
    }

    // ── Extract (blocking) ──────────────────────────────────────────────────
    let _ = app.emit(
        "feature:install-progress",
        json!({ "id": "ocr", "phase": "extract", "pct": 0 }),
    );
    let base_for_extract = base.clone();
    let zip_for_extract = zip_path.clone();
    tokio::task::spawn_blocking(move || extract_zip(&zip_for_extract, &base_for_extract))
        .await
        .context("extract task")??;

    let _ = tokio::fs::remove_file(&zip_path).await;
    tokio::fs::write(base.join("VERSION"), OCR_PACK_VERSION)
        .await
        .context("write VERSION")?;

    if ocr_worker_path(app).is_none() {
        anyhow::bail!("Pack installed but the OCR worker executable wasn't found in it.");
    }

    let _ = app.emit(
        "feature:install-progress",
        json!({ "id": "ocr", "phase": "extract", "pct": 100 }),
    );
    Ok(())
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<()> {
    // Replace any previous worker dir so a reinstall is clean.
    let worker_dir = dest.join(OCR_WORKER_DIR);
    if worker_dir.exists() {
        let _ = std::fs::remove_dir_all(&worker_dir);
    }
    let file = std::fs::File::open(zip_path).context("open zip")?;
    let mut zip = zip::ZipArchive::new(file).context("read zip")?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let rel = match entry.enclosed_name() {
            Some(p) => p.to_path_buf(),
            None => continue, // skip unsafe paths (zip-slip guard)
        };
        let out = dest.join(rel);
        if entry.is_dir() {
            std::fs::create_dir_all(&out)?;
        } else {
            if let Some(parent) = out.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut of = std::fs::File::create(&out)?;
            std::io::copy(&mut entry, &mut of)?;
        }
    }
    Ok(())
}
