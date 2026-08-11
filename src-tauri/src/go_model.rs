//! Go-facing protocol types.
//!
//! These mirror `services/pdf-engine/internal/model/types.go` exactly so the
//! JSON we send/receive over stdin/stdout matches what the Go engine expects.
//! Field names are camelCase (via `#[serde(rename_all = "camelCase")]`) to match
//! Go's `json:"camelCase"` struct tags.

use serde::{Deserialize, Serialize};

/// The JSON-RPC command written to the Go engine's stdin (one per line).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    pub op: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_path: Option<String>,
    /// compare: second input PDF
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_path_b: Option<String>,
    /// merge: multiple input PDFs
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_paths: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,

    // Split operations
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_ranges: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub merge_output: Option<bool>,

    // Signing operations
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cert_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub passphrase: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub zone: Option<SignatureZone>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contact: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub appearance: Option<SignatureAppearance>,

    // Redaction operations
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub marks: Option<Vec<RedactionMark>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub case_sensitive: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub regex: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scale: Option<f64>,

    // OCR operations
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub languages: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dpi: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enable_gpu: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub export_format: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ocr_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub edits: Option<String>,
}

impl Command {
    pub fn new(op: impl Into<String>) -> Self {
        Self {
            op: op.into(),
            input_path: None,
            input_path_b: None,
            input_paths: None,
            output_path: None,
            password: None,
            page_ranges: None,
            merge_output: None,
            cert_path: None,
            passphrase: None,
            page: None,
            zone: None,
            reason: None,
            location: None,
            contact: None,
            appearance: None,
            marks: None,
            query: None,
            case_sensitive: None,
            regex: None,
            scale: None,
            languages: None,
            dpi: None,
            enable_gpu: None,
            export_format: None,
            ocr_data: None,
            edits: None,
        }
    }

    /// Builder: set `inputPath` from a path.
    pub fn input_path_opt(mut self, p: impl AsRef<std::path::Path>) -> Self {
        self.input_path = Some(p.as_ref().to_string_lossy().into_owned());
        self
    }

    /// Builder: set `outputPath` from a path.
    pub fn output_path_opt(mut self, p: impl AsRef<std::path::Path>) -> Self {
        self.output_path = Some(p.as_ref().to_string_lossy().into_owned());
        self
    }
}

/// The JSON-RPC response read from the Go engine's stdout (one-shot ops).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Response {
    pub success: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// A streaming OCR event read from the Go engine's stdout.
///
/// `type` distinguishes: `"progress"` | `"page-result"` | `"page-image"` |
/// `"complete"` | `"error"`. Nested payloads are forwarded as opaque JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrStreamEvent {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_page: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_pages: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_result: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_image: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub overall_confidence: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detected_languages: Option<Vec<String>>,
}

impl OcrStreamEvent {
    pub fn is_terminal(&self) -> bool {
        matches!(self.kind.as_str(), "complete" | "error")
    }
}

// ─── Shared argument/payload structs ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureZone {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureAppearance {
    #[serde(default)]
    pub show_name: bool,
    #[serde(default)]
    pub show_date: bool,
    #[serde(default)]
    pub show_reason: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedactionMark {
    pub page: i64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fill_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label_color: Option<String>,
}
