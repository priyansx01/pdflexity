//! PDF repair command — delegates to the Go engine's `repair` op (pdfcpu).

use crate::commands::pdf::{bridge, with_pdf_suffix};
use crate::go_model::Command;
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};
use tauri::AppHandle;

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_repair(buffer_b64: String, file_name: String, app: AppHandle) -> OpResult {
    let Some(bridge) = bridge(&app).await else {
        return OpResult::err("PDF engine is not available");
    };
    let dir = match make_temp_dir("repair").await {
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
            .send(Command::new("repair").input_path_opt(input).output_path_opt(output.clone()))
            .await?;
        if !resp.success {
            anyhow::bail!(resp.error.unwrap_or_else(|| "Could not repair this PDF".into()));
        }
        let b64 = read_file_b64(&output).await?;
        Ok::<_, anyhow::Error>(b64)
    })
    .await;
    cleanup(&dir).await;
    match result {
        Ok(b64) => OpResult::ok_file(b64, with_pdf_suffix(&file_name, "repaired")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
