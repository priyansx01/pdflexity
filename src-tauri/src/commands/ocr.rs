//! OCR commands — Rust port of `apps/electron/src/ipc/pdf/ocr.ts`.
//!
//! `pdf_ocr_start` is the only streaming op: the bridge emits
//! `pdf:ocr-progress` / `pdf:ocr-page-result` events as pages are processed and
//! resolves with the terminal summary.

use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

use crate::go_bridge::BridgeHolder;
use crate::go_model::Command;
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

async fn bridge(app: &AppHandle) -> Option<std::sync::Arc<crate::go_bridge::GoBridge>> {
    app.state::<BridgeHolder>().get(app.clone()).await.ok()
}

fn generate_job_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("ocr-{nanos:x}")
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_start(
    buffer_b64: String,
    _file_name: String,
    languages: Vec<String>,
    dpi: i64,
    app: AppHandle,
) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let job_id = generate_job_id();
    let dir = match make_temp_dir("ocr").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let output_dir = dir.join("out");
        tokio::fs::create_dir_all(&output_dir).await?;
        let resp = bridge
            .send_streaming(
                Command {
                    languages: Some(languages),
                    dpi: Some(dpi),
                    ..Command::new("ocr-start")
                        .input_path_opt(input.clone())
                        .output_path_opt(output_dir.clone())
                },
                job_id.clone(),
            )
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "OCR processing failed".into()));
        }
        Ok::<_, anyhow::Error>(resp.data.unwrap_or(Value::Null))
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(data) => OpResult::ok(data).with_job_id(job_id),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_cancel(_job_id: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let result = async {
        let resp = bridge.send(Command::new("ocr-cancel")).await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to cancel OCR job".into()));
        }
        Ok::<_, anyhow::Error>(())
    }
    .await;
    match result {
        Ok(()) => OpResult::ok(Value::Null),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_render_page(buffer_b64: String, page: i64, scale: f64, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("ocr-render").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "render.pdf", &bytes).await?;
        let resp = bridge
            .send(Command {
                page: Some(page),
                scale: Some(scale),
                ..Command::new("ocr-render-page").input_path_opt(input.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to render page".into()));
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

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_export(
    buffer_b64: String,
    file_name: String,
    format: String,
    ocr_data: Value,
    edits: Value,
    app: AppHandle,
) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("ocr-export").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "export.pdf", &bytes).await?;
        let base_name = file_name.trim_end_matches(".pdf");
        let ext = match format.as_str() {
            "docx" => ".docx",
            "json" => ".json",
            _ => ".pdf",
        };
        let output = dir.join(format!("{base_name}-ocr{ext}"));
        let resp = bridge
            .send(Command {
                export_format: Some(format),
                ocr_data: Some(serde_json::to_string(&ocr_data)?),
                edits: Some(serde_json::to_string(&edits)?),
                ..Command::new("ocr-export").input_path_opt(input.clone()).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Export failed".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, format!("{}-ocr", file_name.trim_end_matches(".pdf"))),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
