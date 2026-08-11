//! OCR commands.
//!
//! OCR is the only streaming operation. `pdf_ocr_start` streams progress and
//! page results to the frontend via Tauri events (`pdf:ocr-progress`,
//! `pdf:ocr-page-result`), mirroring the Electron channels.
//!
//! NOTE: Step 7 ships these as contract stubs; Step 9 wires them to the Go
//! engine via `go_bridge::send_streaming`.

use crate::result::OpResult;

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_start(
    _buffer_b64: String,
    _file_name: String,
    _languages: Vec<String>,
    _dpi: i64,
) -> OpResult {
    OpResult::err("pdf_ocr_start: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_cancel(_job_id: String) -> OpResult {
    OpResult::err("pdf_ocr_cancel: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_render_page(_buffer_b64: String, _page: i64, _scale: f64) -> OpResult {
    OpResult::err("pdf_ocr_render_page: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_ocr_export(
    _buffer_b64: String,
    _file_name: String,
    _format: String,
    _ocr_data: serde_json::Value,
    _edits: serde_json::Value,
) -> OpResult {
    OpResult::err("pdf_ocr_export: not implemented yet")
}
