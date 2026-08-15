//! PDF operation commands — Rust ports of `apps/electron/src/ipc/pdf/*.ts`.
//!
//! Pattern (identical to the Electron handlers):
//!   1. decode base64 buffer(s)
//!   2. write to a fresh temp dir
//!   3. call the Go engine via `go_bridge`
//!   4. read the result file (or parse JSON) and return base64
//!   5. clean up the temp dir

use serde_json::Value;
use std::path::Path;
use tauri::{AppHandle, Manager};

use crate::go_bridge::BridgeHolder;
use crate::go_model::Command;
use crate::result::{FileInput, OpResult, SignOptions};
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

/// Fetch the engine bridge from managed state, mapping any error to `None`.
async fn bridge(app: &AppHandle) -> Option<std::sync::Arc<crate::go_bridge::GoBridge>> {
    app.state::<BridgeHolder>().get(app.clone()).await.ok()
}

/// Append `_<suffix>.pdf` to a filename, replacing any existing `.pdf`.
fn with_pdf_suffix(name: &str, suffix: &str) -> String {
    let lower = name.to_ascii_lowercase();
    if let Some(stem) = lower.strip_suffix(".pdf") {
        let stem = &name[..stem.len()];
        format!("{stem}_{suffix}.pdf")
    } else {
        format!("{name}_{suffix}.pdf")
    }
}

// ─── unlock ───────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_unlock(buffer_b64: String, password: String, file_name: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("unlock").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let output = dir.join("output.pdf");
        let resp = bridge
            .send(Command {
                password: Some(password),
                ..Command::new("unlock").input_path_opt(input).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Unknown unlock error".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, with_pdf_suffix(&file_name, "unlocked")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── protect ──────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_protect(buffer_b64: String, password: String, file_name: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("protect").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let output = dir.join("output.pdf");
        let resp = bridge
            .send(Command {
                password: Some(password),
                ..Command::new("protect").input_path_opt(input).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Unknown protect error".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, with_pdf_suffix(&file_name, "protected")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── compare ──────────────────────────────────────────────────────────────────
//
// Note: the Go engine packs the diff JSON into `response.outputPath` (a string),
// not into `data`. We parse it and return it as `data`.

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_compare(buffer_a_b64: String, buffer_b_b64: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("cmp").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes_a = decode_b64(&buffer_a_b64)?;
        let bytes_b = decode_b64(&buffer_b_b64)?;
        let input_a = write_file(&dir, "original.pdf", &bytes_a).await?;
        let input_b = write_file(&dir, "modified.pdf", &bytes_b).await?;
        let resp = bridge
            .send(Command {
                input_path_b: Some(input_b.to_string_lossy().into_owned()),
                ..Command::new("compare").input_path_opt(input_a)
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Compare failed".into()));
        }
        let json_str = resp
            .output_path
            .ok_or_else(|| anyhow::anyhow!("Engine returned no diff payload"))?;
        let data: Value = serde_json::from_str(&json_str)?;
        Ok::<_, anyhow::Error>(data)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(data) => OpResult::ok(data),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── merge ────────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_merge(files: Vec<FileInput>, file_name: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("merge").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let mut input_paths = Vec::with_capacity(files.len());
        for (i, f) in files.iter().enumerate() {
            let bytes = decode_b64(&f.buffer)?;
            if bytes.is_empty() {
                anyhow::bail!("File {} was received as empty (0 bytes)", f.name);
            }
            let ext = Path::new(&f.name)
                .extension()
                .map(|e| format!(".{}", e.to_string_lossy()))
                .unwrap_or_else(|| ".pdf".into());
            let p = write_file(&dir, &format!("input_{i}{ext}"), &bytes).await?;
            input_paths.push(p.to_string_lossy().into_owned());
        }
        let output = dir.join("merged.pdf");
        let resp = bridge
            .send(Command {
                input_paths: Some(input_paths),
                ..Command::new("merge").output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Unknown merge error".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, with_pdf_suffix(&file_name, "merged")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── split ────────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_split(
    buffer_b64: String,
    file_name: String,
    page_ranges: Vec<String>,
    merge_output: bool,
    app: AppHandle,
) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("split").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result: anyhow::Result<OpResult> = async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let input = write_file(&dir, &format!("input_{file_name}"), &bytes).await?;

        let output = if merge_output {
            dir.join(format!("split_{file_name}"))
        } else {
            let od = dir.join("output");
            tokio::fs::create_dir_all(&od).await?;
            od
        };

        let resp = bridge
            .send(Command {
                page_ranges: Some(page_ranges),
                merge_output: Some(merge_output),
                ..Command::new("split").input_path_opt(input).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Unknown split error".into()));
        }

        if merge_output {
            let b64 = read_file_b64(&output).await?;
            Ok(OpResult::ok_file(b64, format!("split_{file_name}")))
        } else {
            let mut entries = tokio::fs::read_dir(&output).await?;
            let mut files_out = Vec::new();
            while let Some(entry) = entries.next_entry().await? {
                let name = entry.file_name().to_string_lossy().into_owned();
                if name.ends_with(".pdf") {
                    let b64 = read_file_b64(&entry.path()).await?;
                    files_out.push(serde_json::json!({ "name": name, "data": b64 }));
                }
            }
            Ok(OpResult::ok(Value::Array(files_out)).set_multiple())
        }
    }
    .await;
    cleanup(&dir).await;
    match result {
        Ok(op) => op,
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── sign ─────────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_sign(options: SignOptions, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("sign").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&options.pdf_bytes_b64)?;
        let input = write_file(&dir, "sign_in.pdf", &bytes).await?;
        let output = dir.join("sign_out.pdf");
        let resp = bridge
            .send(Command {
                cert_path: Some(options.cert_path.clone()),
                passphrase: Some(options.passphrase.clone()),
                page: Some(options.page),
                zone: Some(options.zone.clone()),
                reason: Some(options.reason.clone()),
                location: Some(options.location.clone()),
                contact: Some(options.contact.clone()),
                appearance: options.appearance.clone(),
                ..Command::new("sign").input_path_opt(input).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to sign PDF".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(
            b64,
            format!("signed_{}", options.file_name.clone().unwrap_or_else(|| "document.pdf".into())),
        ),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── verify ───────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_verify(buffer_b64: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("verify").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let input = write_file(&dir, "verify_in.pdf", &bytes).await?;
        let resp = bridge
            .send(Command::new("verify").input_path_opt(input.clone()))
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to verify signatures".into()));
        }
        Ok::<_, anyhow::Error>(resp.data.unwrap_or(Value::Null))
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(data) => OpResult::ok(data),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

// ─── certInfo ─────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_cert_info(cert_path: String, passphrase: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let result = async {
        let resp = bridge
            .send(Command {
                cert_path: Some(cert_path),
                passphrase: Some(passphrase),
                ..Command::new("certInfo")
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to parse certificate".into()));
        }
        Ok::<_, anyhow::Error>(resp.data.unwrap_or(Value::Null))
    }
    .await;
    match result {
        Ok(data) => OpResult::ok(data),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
