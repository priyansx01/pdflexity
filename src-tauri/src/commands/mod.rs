//! All Tauri commands, grouped by domain.
//!
//! Registered in `lib.rs` via `tauri::generate_handler!`.

pub mod app;
pub mod compress;
pub mod edit;
pub mod features;
pub mod ocr;
pub mod pdf;
pub mod redact;
pub mod repair;
pub mod rotate;
