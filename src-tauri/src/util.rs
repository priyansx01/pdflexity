//! Small helpers shared by command handlers: base64 codec and temp-file I/O.
//!
//! The Electron handlers wrote incoming buffers to a temp dir, called the Go
//! engine with file paths, then read the result back and returned base64. We
//! replicate that exactly here.

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine};
use tokio::fs;

/// Decode a base64 string to bytes (URL-safe not used; standard alphabet).
pub fn decode_b64(s: &str) -> Result<Vec<u8>> {
    general_purpose::STANDARD
        .decode(s.trim())
        .context("invalid base64 input")
}

/// Encode bytes to a standard base64 string.
pub fn encode_b64(bytes: &[u8]) -> String {
    general_purpose::STANDARD.encode(bytes)
}

/// Create a fresh per-operation temp directory under the OS temp dir, prefixed
/// so it's easy to identify/clean. Returns the path.
pub async fn make_temp_dir(prefix: &str) -> Result<PathBuf> {
    let base = std::env::temp_dir().join("pdflexity");
    fs::create_dir_all(&base).await.ok();
    let dir = base.join(format!("{}-{}", prefix, short_uuid()));
    fs::create_dir_all(&dir).await?;
    Ok(dir)
}

/// Write bytes to `dir/<name>`.
pub async fn write_file(dir: &Path, name: &str, bytes: &[u8]) -> Result<PathBuf> {
    let path = dir.join(name);
    fs::write(&path, bytes)
        .await
        .with_context(|| format!("write {}", path.display()))?;
    Ok(path)
}

/// Read a file to bytes.
pub async fn read_file(path: &Path) -> Result<Vec<u8>> {
    fs::read(path)
        .await
        .with_context(|| format!("read {}", path.display()))
}

/// Read a file and return its base64 encoding.
pub async fn read_file_b64(path: &Path) -> Result<String> {
    let bytes = read_file(path).await?;
    Ok(encode_b64(&bytes))
}

/// Recursively remove a directory, ignoring errors (best-effort cleanup).
pub async fn cleanup(dir: &Path) {
    let _ = fs::remove_dir_all(dir).await;
}

/// A short, process-unique-enough id for temp dir names.
fn short_uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:x}", nanos)
}
