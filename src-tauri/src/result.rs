//! Frontend-facing result envelope.
//!
//! Every Rust command returns `OpResult`, which serializes to the discriminated
//! union shape the frontend expects (`electron-env.d.ts`): an object with
//! `success: boolean` plus whichever of `data` / `fileName` / `isMultiple` /
//! `jobId` / `marksApplied` / `pagesAffected` / `error` are relevant.
//!
//! Commands always return this envelope (never throw) so the existing frontend
//! code path `if (!result.success) throw new Error(result.error)` keeps working
//! unchanged.

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_multiple: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub marks_applied: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pages_affected: Option<Vec<i64>>,
}

impl OpResult {
    /// A successful result carrying arbitrary JSON `data`.
    pub fn ok(data: impl Into<Value>) -> Self {
        Self {
            success: true,
            data: Some(data.into()),
            file_name: None,
            error: None,
            is_multiple: None,
            job_id: None,
            marks_applied: None,
            pages_affected: None,
        }
    }

    /// A successful result with a base64 `data` payload and a `fileName`.
    pub fn ok_file(data_b64: impl Into<String>, file_name: impl Into<String>) -> Self {
        Self {
            success: true,
            data: Some(Value::String(data_b64.into())),
            file_name: Some(file_name.into()),
            error: None,
            is_multiple: None,
            job_id: None,
            marks_applied: None,
            pages_affected: None,
        }
    }

    /// A failed result.
    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            file_name: None,
            error: Some(message.into()),
            is_multiple: None,
            job_id: None,
            marks_applied: None,
            pages_affected: None,
        }
    }

    pub fn with_file_name(mut self, file_name: impl Into<String>) -> Self {
        self.file_name = Some(file_name.into());
        self
    }

    pub fn with_job_id(mut self, job_id: impl Into<String>) -> Self {
        self.job_id = Some(job_id.into());
        self
    }

    pub fn with_marks(mut self, applied: i64, pages: Vec<i64>) -> Self {
        self.marks_applied = Some(applied);
        self.pages_affected = Some(pages);
        self
    }

    pub fn set_multiple(mut self) -> Self {
        self.is_multiple = Some(true);
        self
    }
}

// ─── Frontend → Rust argument DTOs ─────────────────────────────────────────────
//
// Buffers arrive as base64 strings (the frontend adapter converts ArrayBuffer →
// base64 before invoking). See `lib/backend.ts` in the renderer.

/// A single file passed to `pdf_merge`.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInput {
    /// Base64-encoded file bytes.
    pub buffer: String,
    pub name: String,
}

/// Arguments for `pdf_sign`. Mirrors the `options` object the frontend sends.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignOptions {
    /// Base64-encoded PDF bytes.
    #[serde(rename = "pdfBytes")]
    pub pdf_bytes_b64: String,
    pub cert_path: String,
    pub passphrase: String,
    pub page: i64,
    pub zone: crate::go_model::SignatureZone,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub contact: String,
    #[serde(default)]
    pub appearance: Option<crate::go_model::SignatureAppearance>,
    #[serde(default)]
    pub file_name: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ok_file_result_has_expected_shape() {
        let v = serde_json::to_value(OpResult::ok_file("AAAA", "out.pdf")).unwrap();
        assert_eq!(v["success"], true);
        assert_eq!(v["data"], "AAAA");
        assert_eq!(v["fileName"], "out.pdf");
        assert!(v.get("error").is_none());
    }

    #[test]
    fn error_result_has_message_only() {
        let v = serde_json::to_value(OpResult::err("nope")).unwrap();
        assert_eq!(v["success"], false);
        assert_eq!(v["error"], "nope");
        assert!(v.get("data").is_none());
    }

    #[test]
    fn split_multiple_result_shape() {
        let v = serde_json::to_value(
            OpResult::ok(serde_json::json!([{"name": "a.pdf", "data": "AA=="}])).set_multiple(),
        )
        .unwrap();
        assert_eq!(v["success"], true);
        assert_eq!(v["isMultiple"], true);
        assert!(v["data"].is_array());
    }
}
