//! Page rotation command — pure Rust pipeline (`pdf_ops::rotate`).
//!
//! Same contract as the Go-engine commands: base64 in, base64 out. The work
//! runs on the blocking thread pool since lopdf parsing is CPU-bound.

use tauri::AppHandle;

use crate::commands::pdf::with_pdf_suffix;
use crate::pdf_ops::rotate::rotate_pages;
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_rotate(
    buffer_b64: String,
    file_name: String,
    angle: i64,
    pages: Option<String>,
    _app: AppHandle,
) -> OpResult {
    let dir = match make_temp_dir("rotate").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };

    let result: anyhow::Result<String> = async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let input = write_file(&dir, "input.pdf", &bytes).await?;
        let output = dir.join("output.pdf");
        let output_for_task = output.clone();

        // lopdf is synchronous and CPU-heavy — keep it off the async runtime.
        tauri::async_runtime::spawn_blocking(move || {
            rotate_pages(&input, &output_for_task, angle, pages.as_deref())
        })
        .await
        .map_err(|e| anyhow::anyhow!("Rotation task failed: {e}"))??;

        read_file_b64(&output).await
    }
    .await;
    cleanup(&dir).await;

    match result {
        Ok(b64) => OpResult::ok_file(b64, with_pdf_suffix(&file_name, "rotated")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}
