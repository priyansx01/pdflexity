//! Integration test: verifies the Go engine's stdin/stdout JSON-line protocol.
//!
//! This is the core assumption `GoBridge` relies on. We spawn the real binary
//! and round-trip a command, checking framing + JSON. (We use an unknown op so
//! no real PDF input is required — the engine still responds with a well-formed
//! error, proving the protocol works end-to-end.)

use std::path::PathBuf;
use std::time::Duration;

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

fn engine_binary() -> PathBuf {
    let exe = if cfg!(windows) {
        "pdflexity-engine.exe"
    } else {
        "pdflexity-engine"
    };
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin").join(exe)
}

#[tokio::test(flavor = "current_thread")]
#[ignore = "blocked by Windows Application Control on some dev machines; run with `cargo test -- --ignored` where allowed"]
async fn engine_round_trips_json_protocol() {
    let binary = engine_binary();
    assert!(
        binary.exists(),
        "engine binary missing at {} — build it first",
        binary.display()
    );

    let mut cmd = Command::new(&binary);
    cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null());
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().expect("spawn engine");
    let mut stdin = child.stdin.take().expect("stdin");
    let stdout = child.stdout.take().expect("stdout");
    let mut reader = BufReader::new(stdout).lines();

    // Send an unknown op; the engine must reply with a one-line JSON error.
    let line = serde_json::json!({ "op": "__test_unknown_op__" }).to_string() + "\n";
    stdin.write_all(line.as_bytes()).await.expect("write cmd");
    drop(stdin);

    let response = timeout(Duration::from_secs(30), reader.next_line())
        .await
        .expect("timed out waiting for engine response")
        .expect("io error reading engine stdout")
        .expect("engine closed stdout without response");

    let value: serde_json::Value =
        serde_json::from_str(response.trim()).expect("response is valid JSON");

    assert_eq!(
        value["success"], false,
        "unknown op should report failure: {response}"
    );
    assert!(
        value["error"].as_str().unwrap_or("").contains("unknown operation"),
        "error message should mention unknown operation: {response}"
    );

    // Clean shutdown.
    let _ = child.kill().await;
}
