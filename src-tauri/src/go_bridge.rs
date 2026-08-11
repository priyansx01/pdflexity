//! `GoBridge` — Rust port of the Electron `go-bridge.ts`.
//!
//! Spawns the `pdflexity-engine` binary as a long-running child process and
//! speaks the newline-delimited JSON protocol defined in `go_model.rs`:
//!
//!   stdin:  one `Command` per line
//!   stdout: one `Response` (one-shot ops) OR multiple `OcrStreamEvent`s
//!           (OCR), terminated by a `"complete"` / `"error"` event
//!
//! One engine process is shared. A single in-flight slot (`pending`) holds the
//! resolver for the current op — for one-shot ops it's resolved by a `Response`,
//! for OCR it's resolved by the terminal event (after forwarding intermediate
//! events as Tauri events). The frontend issues one PDF op at a time, so a
//! single slot is sufficient and keeps correctness simple.

use std::sync::Arc;
use std::time::Duration;

use anyhow::{anyhow, Context, Result};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout};
use tokio::sync::{oneshot, Mutex};

use crate::go_model::{Command, OcrStreamEvent, Response};

/// Event channels the OCR streaming path emits to the frontend.
/// Names mirror the original Electron channels (`Channels.PDF_OCR_*`).
pub const OCR_PROGRESS_EVENT: &str = "pdf:ocr-progress";
pub const OCR_PAGE_RESULT_EVENT: &str = "pdf:ocr-page-result";

const RESPONSE_TIMEOUT_SECS: u64 = 600;
const OCR_TIMEOUT_SECS: u64 = 1800;

/// A bridge to the Go PDF engine binary.
pub struct GoBridge {
    inner: Mutex<Inner>,
}

/// Managed-state holder that lazily creates the bridge on first use (from within
/// the async runtime, where `tokio::spawn` / `tokio::process` are available).
/// Tauri's `setup()` runs outside the runtime, so we cannot spawn there.
pub struct BridgeHolder {
    bridge: Mutex<Option<Arc<GoBridge>>>,
}

impl BridgeHolder {
    pub fn new() -> Self {
        Self {
            bridge: Mutex::new(None),
        }
    }

    /// Returns the shared bridge, creating it on first call. If the engine has
    /// died since the last use, a fresh one is spawned.
    pub async fn get(&self, app: AppHandle) -> Result<Arc<GoBridge>> {
        let mut guard = self.bridge.lock().await;
        if let Some(existing) = guard.as_ref() {
            let alive = existing.inner.lock().await.is_alive();
            if alive {
                return Ok(Arc::clone(existing));
            }
        }
        let bridge = GoBridge::spawn(app)?;
        *guard = Some(Arc::clone(&bridge));
        Ok(bridge)
    }
}

struct Inner {
    child: Child,
    stdin: ChildStdin,
    /// Resolver for the single in-flight op (one-shot or streaming).
    pending: Option<oneshot::Sender<Response>>,
    app: AppHandle,
}

impl GoBridge {
    /// Send a one-shot command and await exactly one `Response`.
    pub async fn send(&self, cmd: Command) -> Result<Response> {
        let rx = self.dispatch(cmd).await?;
        tokio::time::timeout(Duration::from_secs(RESPONSE_TIMEOUT_SECS), rx)
            .await
            .map_err(|_| anyhow!("Timed out waiting for PDF engine response"))?
            .map_err(|_| anyhow!("PDF engine response channel closed"))
    }

    /// Send a streaming command (OCR). Intermediate events are emitted as Tauri
    /// events; the future resolves with a `Response` derived from the terminal
    /// `complete` / `error` event.
    pub async fn send_streaming(&self, cmd: Command) -> Result<Response> {
        let rx = self.dispatch(cmd).await?;
        tokio::time::timeout(Duration::from_secs(OCR_TIMEOUT_SECS), rx)
            .await
            .map_err(|_| anyhow!("Timed out waiting for OCR stream"))?
            .map_err(|_| anyhow!("OCR stream channel closed"))
    }

    /// Install a resolver for an in-flight op and write the command line.
    async fn dispatch(&self, cmd: Command) -> Result<oneshot::Receiver<Response>> {
        let (tx, rx) = oneshot::channel::<Response>();
        {
            let mut inner = self.inner.lock().await;
            if !inner.is_alive() {
                anyhow::bail!("PDF engine process is not running");
            }
            if inner.pending.is_some() {
                anyhow::bail!("Another PDF operation is already in progress");
            }
            let mut line = serde_json::to_vec(&cmd).context("serialize command")?;
            line.push(b'\n');
            inner
                .stdin
                .write_all(&line)
                .await
                .context("write to engine stdin")?;
            inner.pending = Some(tx);
        }
        Ok(rx)
    }
}

impl GoBridge {
    /// Spawn the engine binary and start the stdout reader task.
    pub fn spawn(app: AppHandle) -> Result<Arc<Self>> {
        let binary = resolve_engine_path(&app)?;
        if !binary.exists() {
            return Err(anyhow!(
                "PDF engine binary not found at: {}\nBuild it with: cd services/pdf-engine && go build -o ../../src-tauri/bin/pdflexity-engine{} ./cmd/pdflexity-engine/",
                binary.display(),
                if cfg!(windows) { ".exe" } else { "" }
            ));
        }

        let mut command = tokio::process::Command::new(&binary);
        command
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());
        // On Windows, hide the engine's console window.
        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            command.creation_flags(CREATE_NO_WINDOW);
        }
        let mut child = command
            .spawn()
            .with_context(|| format!("failed to spawn engine at {}", binary.display()))?;

        let stdin = child.stdin.take().ok_or_else(|| anyhow!("no stdin"))?;
        let stdout = child.stdout.take().ok_or_else(|| anyhow!("no stdout"))?;

        // Route stderr to the log.
        if let Some(stderr) = child.stderr.take() {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    log::info!("[pdf-engine] {}", line);
                }
            });
        }

        let bridge = Arc::new(GoBridge {
            inner: Mutex::new(Inner {
                child,
                stdin,
                pending: None,
                app: app.clone(),
            }),
        });

        // Reader task: parses stdout lines and routes them.
        let bridge2 = Arc::clone(&bridge);
        tokio::spawn(async move {
            reader_loop(bridge2, stdout).await;
        });

        Ok(bridge)
    }
}

/// The stdout reader: one JSON object per line.
async fn reader_loop(bridge: Arc<GoBridge>, stdout: ChildStdout) {
    let mut reader = BufReader::new(stdout).lines();
    loop {
        match reader.next_line().await {
            Ok(Some(line)) => {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let value: Value = match serde_json::from_str(trimmed) {
                    Ok(v) => v,
                    Err(_) => {
                        log::warn!("[pdf-engine] bad JSON from stdout: {}", trimmed);
                        continue;
                    }
                };

                if value.get("type").is_some() {
                    // OCR streaming event.
                    match serde_json::from_value::<OcrStreamEvent>(value) {
                        Ok(event) => handle_stream_event(&bridge, event).await,
                        Err(e) => log::warn!("[pdf-engine] bad OCR event: {e}"),
                    }
                } else {
                    // One-shot Response.
                    match serde_json::from_value::<Response>(value) {
                        Ok(resp) => {
                            let mut inner = bridge.inner.lock().await;
                            if let Some(tx) = inner.pending.take() {
                                let _ = tx.send(resp);
                            }
                        }
                        Err(e) => log::warn!("[pdf-engine] bad response: {e}"),
                    }
                }
            }
            Ok(None) => {
                log::warn!("[pdf-engine] stdout closed");
                fail_pending(&bridge, "PDF engine closed its stdout").await;
                break;
            }
            Err(e) => {
                log::error!("[pdf-engine] stdout read error: {e}");
                fail_pending(&bridge, &format!("PDF engine read error: {e}")).await;
                break;
            }
        }
    }
}

/// Forward OCR events to the frontend; resolve the in-flight op on terminal.
async fn handle_stream_event(bridge: &Arc<GoBridge>, event: OcrStreamEvent) {
    let terminal = event.is_terminal();
    let emit_value = serde_json::to_value(&event).unwrap_or(Value::Null);

    let mut inner = bridge.inner.lock().await;

    match event.kind.as_str() {
        "progress" => {
            let _ = inner.app.emit(OCR_PROGRESS_EVENT, &emit_value);
        }
        "page-result" | "page-image" => {
            let _ = inner.app.emit(OCR_PAGE_RESULT_EVENT, &emit_value);
        }
        _ => {}
    }

    if terminal {
        let resp = if event.kind == "error" {
            Response {
                success: false,
                output_path: None,
                error: event.error.clone(),
                data: None,
            }
        } else {
            Response {
                success: true,
                output_path: None,
                error: None,
                data: event.data.clone(),
            }
        };
        if let Some(tx) = inner.pending.take() {
            let _ = tx.send(resp);
        }
    }
}

/// Resolve a pending op with an error (e.g. engine died mid-op).
async fn fail_pending(bridge: &Arc<GoBridge>, message: &str) {
    let mut inner = bridge.inner.lock().await;
    if let Some(tx) = inner.pending.take() {
        let _ = tx.send(Response {
            success: false,
            output_path: None,
            error: Some(message.to_string()),
            data: None,
        });
    }
}

impl Inner {
    /// True if the child process is still running.
    fn is_alive(&mut self) -> bool {
        matches!(self.child.try_wait(), Ok(None))
    }
}

// ─── Path resolution ─────────────────────────────────────────────────────────

/// Resolve the engine binary path:
/// - Production: the `bin/` resource directory bundled by Tauri
/// - Development: `<src-tauri>/bin/pdflexity-engine(.exe)`
fn resolve_engine_path(app: &AppHandle) -> Result<std::path::PathBuf> {
    let exe_name = if cfg!(windows) {
        "pdflexity-engine.exe"
    } else {
        "pdflexity-engine"
    };

    // 1. Bundled resource (production).
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join("bin").join(exe_name);
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    // 2. Development: locate src-tauri/bin by walking up from the current exe
    //    to the directory containing `Cargo.toml` (i.e. `src-tauri/`).
    if let Ok(current_exe) = std::env::current_exe() {
        let mut dir = current_exe.parent().map(std::path::Path::to_path_buf);
        while let Some(d) = dir {
            if d.join("Cargo.toml").exists() {
                let candidate = d.join("bin").join(exe_name);
                if candidate.exists() {
                    return Ok(candidate);
                }
                break;
            }
            dir = d.parent().map(std::path::Path::to_path_buf);
        }
    }

    // 3. Fallback relative to CWD.
    Ok(std::path::PathBuf::from("bin").join(exe_name))
}
