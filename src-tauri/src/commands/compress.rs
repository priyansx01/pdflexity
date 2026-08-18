//! PDF compression command — pure Rust pipeline (`pdf_ops::compress`) with
//! `job:progress` events streamed to the frontend (pct + stage).

use anyhow::anyhow;
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

use crate::pdf_ops::compress::{compress_pdf, preset_params, CompressStats, CUSTOM_LADDER};
use crate::result::OpResult;
use crate::util::{cleanup, decode_b64, make_temp_dir, read_file_b64, write_file};

const CUSTOM_MAX_ITERATIONS: usize = 8;

#[tauri::command(rename_all = "camelCase")]
pub async fn pdf_compress(
    buffer_b64: String,
    file_name: String,
    preset: String,
    target_size_bytes: Option<u64>,
    app: AppHandle,
) -> OpResult {
    let dir = match make_temp_dir("compress").await {
        Ok(d) => d,
        Err(e) => return OpResult::err(format!("{e:#}")),
    };

    let result: anyhow::Result<(PathBuf, Value)> = async {
        let bytes = decode_b64(&buffer_b64)?;
        if bytes.is_empty() {
            anyhow::bail!("The file arrived empty (0 bytes). Please clear it and load the PDF again.");
        }
        let _input = write_file(&dir, "input.pdf", &bytes).await?;

        // Progress channel: blocking worker -> emit task.
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<(u8, String)>();
        let app2 = app.clone();
        let emit_task = tokio::spawn(async move {
            while let Some((pct, stage)) = rx.recv().await {
                let _ = app2.emit("job:progress", json!({ "pct": pct, "stage": stage }));
            }
        });

        let out_dir = dir.clone();
        let preset_in = preset.clone();
        let target_in = target_size_bytes;
        let tx = std::sync::Arc::new(tx);
        let handle = tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<(PathBuf, Value)> {
            let run = |suffix: &str, progress: &dyn Fn(u8, &str)| -> anyhow::Result<(PathBuf, CompressStats)> {
                let output = out_dir.join(format!("out-{suffix}.pdf"));
                let params = preset_params(&preset_in);
                let stats = compress_pdf(&out_dir.join("input.pdf"), &output, &params, progress)?;
                Ok((output, stats))
            };

            if preset_in != "custom" {
                let txf = std::sync::Arc::clone(&tx);
                let (output, stats) = run("final", &move |pct, stage| {
                    let _ = txf.send((pct, stage.to_string()));
                })?;
                let b64 = std::fs::read(&output)?;
                let data = stats_json(&stats, &preset_in, true, target_in);
                let payload = json!({ "stats": data, "pdf": crate::util::encode_b64(&b64) });
                return Ok((output, payload));
            }

            // Custom target size: lossless first, then climb the ladder until
            // the output is <= target (bounded by CUSTOM_MAX_ITERATIONS).
            let target = target_in
                .ok_or_else(|| anyhow!("Custom compression needs a target size"))?;

            // Seed with the lossless pass result (run below), then improve.
            #[allow(unused_assignments)]
            let mut best: Option<(PathBuf, CompressStats)> = None;
            #[allow(unused_assignments)]
            let mut best_effort = true;

            // Pass 0: lossless.
            {
                let tx0 = std::sync::Arc::clone(&tx);
                let (output, stats) = run("p0", &move |pct, stage| {
                    // Lossless pass occupies the first slice of progress.
                    let _ = tx0.send((pct / 10, stage.to_string()));
                })?;
                best = Some((output, stats));
                best_effort = stats.compressed_bytes > target;
            }

            if best_effort {
                let ladder_len = CUSTOM_LADDER.len();
                for (i, (_edge, _quality)) in CUSTOM_LADDER.iter().enumerate() {
                    if i + 1 >= CUSTOM_MAX_ITERATIONS {
                        break;
                    }
                    let span_start = 10 + (i as u32 * 80 / ladder_len as u32);
                    let span_end = 10 + ((i + 1) as u32 * 80 / ladder_len as u32);
                    let tx_i = std::sync::Arc::clone(&tx);
                    let (output, stats) = run(
                        &format!("p{}", i + 1),
                        &move |pct, stage| {
                            let local = pct.min(100) as u32;
                            let scaled = span_start + local * (span_end - span_start) / 100;
                            let _ = tx_i.send((scaled.min(95) as u8, stage.to_string()));
                        },
                    )?;
                    if stats.compressed_bytes <= target {
                        best = Some((output, stats));
                        best_effort = false;
                        break;
                    }
                    // Keep the smallest result so far.
                    let is_smaller = best
                        .as_ref()
                        .map(|(_, b)| stats.compressed_bytes < b.compressed_bytes)
                        .unwrap_or(true);
                    if is_smaller {
                        best = Some((output, stats));
                    }
                }
            }

            let (output, stats) = best.ok_or_else(|| anyhow!("compression produced no output"))?;
            let data = stats_json(&stats, &preset_in, !best_effort, Some(target));
            let b64 = std::fs::read(&output)?;
            let payload = json!({ "stats": data, "pdf": crate::util::encode_b64(&b64) });
            Ok((output, payload))
        });

        let (output, payload) = handle
            .await
            .map_err(|e| anyhow!("compression task failed: {e}"))??;
        drop(emit_task);

        let _ = read_file_b64(&output).await?; // validate output readable
        Ok((dir.clone(), payload))
    }
    .await;

    cleanup(&dir).await;

    match result {
        Ok((_, payload)) => OpResult::ok(payload)
            .with_file_name(format!("compressed_{file_name}")),
        Err(e) => OpResult::err(format!("{e:#}")),
    }
}

fn stats_json(
    stats: &CompressStats,
    preset: &str,
    target_met: bool,
    target_size_bytes: Option<u64>,
) -> Value {
    json!({
        "originalBytes": stats.original_bytes,
        "compressedBytes": stats.compressed_bytes,
        "savedPercent": (stats.saved_percent() * 10.0).round() / 10.0,
        "imagesSeen": stats.images_seen,
        "imagesRecompressed": stats.images_recompressed,
        "imagesSkippedCodec": stats.images_skipped_codec,
        "imagesSkippedOptimal": stats.images_skipped_optimal,
        "preset": preset,
        "targetMet": target_met,
        "targetSizeBytes": target_size_bytes,
    })
}

// keep clippy quiet about an unused import path on some toolchains
#[allow(unused)]
fn _unused_path(_: PathBuf) {}
