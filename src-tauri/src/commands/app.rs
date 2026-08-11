//! App-level commands (implemented fully — no engine dependency).

/// Returns the OS platform in Node.js style (`win32` / `darwin` / `linux`),
/// matching Electron's original `process.platform` behavior.
#[tauri::command(rename_all = "camelCase")]
pub fn app_get_platform() -> String {
    match std::env::consts::OS {
        "windows" => "win32",
        "macos" => "darwin",
        other => other,
    }
    .to_string()
}

/// Returns the application version (from Cargo.toml).
#[tauri::command(rename_all = "camelCase")]
pub fn app_get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Opens an http/https URL in the user's default browser.
/// Mirrors Electron's `shell.openExternal` (http/https only).
#[tauri::command(rename_all = "camelCase")]
pub fn open_external(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http/https URLs are allowed".to_string());
    }
    open::that(url).map_err(|e| e.to_string())
}
