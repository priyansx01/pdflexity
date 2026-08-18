//! Pure-Rust PDF operations (compression, …). No subprocesses — all work runs
//! inside the Tauri backend on the blocking thread pool.

pub mod compress;
