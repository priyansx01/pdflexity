//! Redaction commands — Rust port of `apps/electron/src/ipc/pdf/redact.ts`.

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::go_bridge::BridgeHolder;
use crate::go_model::{Command, RedactionMark};
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

async fn bridge(app: &AppHandle) -> Option<std::sync::Arc<crate::go_bridge::GoBridge>> {
    app.state::<BridgeHolder>().get(app.clone()).await.ok()
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_redact_info(buffer_b64: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("redact").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "info.pdf", &bytes).await?;
        let resp = bridge.send(Command::new("redactInfo").input_path_opt(input.clone())).await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to get PDF info".into()));
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
pub async fn pdf_redact_search(
    buffer_b64: String,
    query: String,
    case_sensitive: Option<bool>,
    regex: Option<bool>,
    app: AppHandle,
) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("redact").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "search.pdf", &bytes).await?;
        let resp = bridge
            .send(Command {
                query: Some(query),
                case_sensitive,
                regex,
                ..Command::new("redactSearch").input_path_opt(input.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to search PDF".into()));
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
pub async fn pdf_redact_preview(
    buffer_b64: String,
    page: i64,
    scale: Option<f64>,
    marks: Option<Vec<RedactionMark>>,
    app: AppHandle,
) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("redact").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "preview.pdf", &bytes).await?;
        let resp = bridge
            .send(Command {
                page: Some(page),
                scale,
                marks,
                ..Command::new("redactPreview").input_path_opt(input.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to generate preview".into()));
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
pub async fn pdf_redact_apply(
    buffer_b64: String,
    file_name: String,
    marks: Vec<RedactionMark>,
    app: AppHandle,
) -> OpResult {
    let supplied_marks = marks.len() as i64;
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("redact").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };
    let result = (async {
        let bytes = decode_b64(&buffer_b64)?;
        let input = write_file(&dir, "in.pdf", &bytes).await?;
        let output = dir.join("redacted.pdf");
        let resp = bridge
            .send(Command {
                marks: Some(marks),
                ..Command::new("redact").input_path_opt(input.clone()).output_path_opt(output.clone())
            })
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Failed to redact PDF".into()));
        }
        let b64 = read_file_b64(&output).await?;

        let (marks_applied, pages_affected) = match resp.data {
            Some(Value::Object(map)) => {
                let applied = map.get("marksApplied").and_then(|v| v.as_i64()).unwrap_or(supplied_marks);
                let pages = map
                    .get("pagesAffected")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_i64()).collect::<Vec<_>>())
                    .unwrap_or_default();
                (applied, pages)
            }
            _ => (supplied_marks, Vec::new()),
        };
        Ok::<_, anyhow::Error>((b64, marks_applied, pages_affected))
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok((b64, applied, pages)) => {
            OpResult::ok_file(b64, format!("redacted_{file_name}")).with_marks(applied, pages)
        }
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
