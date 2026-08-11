//! PDF operation commands.
//!
//! Signatures match the `ElectronAPI.pdf.*` contract. Buffers arrive as
//! base64 strings (frontend adapter converts ArrayBuffer → base64).
//!
//! NOTE: Step 7 ships these as contract stubs; Step 9 wires them to the Go
//! engine via `go_bridge`.

use crate::result::{FileInput, OpResult, SignOptions};

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_unlock(_buffer_b64: String, _password: String, _file_name: String) -> OpResult {
    OpResult::err("pdf_unlock: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_protect(_buffer_b64: String, _password: String, _file_name: String) -> OpResult {
    OpResult::err("pdf_protect: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_compare(_buffer_a_b64: String, _buffer_b_b64: String) -> OpResult {
    OpResult::err("pdf_compare: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_merge(_files: Vec<FileInput>, _file_name: String) -> OpResult {
    OpResult::err("pdf_merge: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_split(
    _buffer_b64: String,
    _file_name: String,
    _page_ranges: Vec<String>,
    _merge_output: bool,
) -> OpResult {
    OpResult::err("pdf_split: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_sign(_options: SignOptions) -> OpResult {
    OpResult::err("pdf_sign: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_verify(_buffer_b64: String) -> OpResult {
    OpResult::err("pdf_verify: not implemented yet")
}

#[tauri::command(rename_all = "camelCase")]
pub fn pdf_cert_info(_cert_path: String, _passphrase: String) -> OpResult {
    OpResult::err("pdf_cert_info: not implemented yet")
}
