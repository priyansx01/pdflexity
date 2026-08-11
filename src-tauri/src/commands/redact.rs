//! Redaction commands.
//!
//! NOTE: Step 7 ships these as contract stubs; Step 9 wires them to the Go
//! engine via `go_bridge`.

use crate::go_model::RedactionMark;
use crate::result::OpResult;

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_redact_info(_buffer_b64: String) -> OpResult {
    OpResult::err("pdf_redact_info: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_redact_search(
    _buffer_b64: String,
    _query: String,
    _case_sensitive: Option<bool>,
    _regex: Option<bool>,
) -> OpResult {
    OpResult::err("pdf_redact_search: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_redact_preview(
    _buffer_b64: String,
    _page: i64,
    _scale: Option<f64>,
    _marks: Option<Vec<RedactionMark>>,
) -> OpResult {
    OpResult::err("pdf_redact_preview: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_redact_apply(
    _buffer_b64: String,
    _file_name: String,
    _marks: Vec<RedactionMark>,
) -> OpResult {
    OpResult::err("pdf_redact_apply: not implemented yet")
}
