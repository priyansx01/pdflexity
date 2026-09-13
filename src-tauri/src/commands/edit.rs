//! PDF editor commands — extract an editable text model, and apply edits back
//! into the PDF. Both run through the bundled fitz worker (the OCR feature pack).

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::commands::features::ocr_worker_path;
use crate::go_bridge::BridgeHolder;
use crate::go_model::Command;
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

async fn bridge(app: &AppHandle) -> Option<std::sync::Arc<crate::go_bridge::GoBridge>> {
    app.state::<BridgeHolder>().get(app.clone()).await.ok()
}

fn worker(app: &AppHandle) -> Option<String> {
    ocr_worker_path(app).map(|p| p.to_string_lossy().into_owned())
}

/// Extract the per-page editable text model (blocks with bbox/font/size/color).
#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_edit_extract(buffer_b64: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("edit").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let resp = bridge
            .send(Command {
                worker_path: worker(&app),
                ..Command::new("edit-extract").input_path_opt(input.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to read PDF text".into()));
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

/// Apply an edit list to the PDF (redact originals, redraw edited text) and
/// return the new PDF as base64.
#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_edit_apply(buffer_b64: String, file_name: String, edits: Value, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("edit-apply").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let base_name = file_name.trim_end_matches(".pdf");
        let output = dir.join(format!("{base_name}-edited.pdf"));
        let resp = bridge
            .send(Command {
                worker_path: worker(&app),
                edit_data: Some(serde_json::to_string(&edits)?),
                ..Command::new("edit-apply")
                    .input_path_opt(input.clone())
                    .output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to apply edits".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, format!("{}-edited", file_name.trim_end_matches(".pdf"))),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
