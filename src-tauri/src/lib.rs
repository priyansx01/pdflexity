mod commands;
mod go_bridge;
mod go_model;
mod result;
mod util;

use go_bridge::BridgeHolder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // The PDF engine is spawned lazily on first PDF/OCR command
            // (from within the async runtime). Here we just register the
            // holder so commands can fetch it, and log the resolved binary path.
            go_bridge::log_engine_path(app.handle());
            app.manage(BridgeHolder::new());

            // Show the main window now (config sets visible:false to avoid a
            // white flash before the webview is ready). Frameless window — the
            // renderer draws its own TitleBar (drag region via data-tauri-drag-region).
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // App
            commands::app::app_get_platform,
            commands::app::app_get_version,
            commands::app::open_external,
            // PDF
            commands::pdf::pdf_unlock,
            commands::pdf::pdf_protect,
            commands::pdf::pdf_compare,
            commands::pdf::pdf_merge,
            commands::pdf::pdf_split,
            commands::pdf::pdf_sign,
            commands::pdf::pdf_verify,
            commands::pdf::pdf_cert_info,
            // Redaction
            commands::redact::pdf_redact_info,
            commands::redact::pdf_redact_search,
            commands::redact::pdf_redact_preview,
            commands::redact::pdf_redact_apply,
            // OCR
            commands::ocr::pdf_ocr_start,
            commands::ocr::pdf_ocr_cancel,
            commands::ocr::pdf_ocr_render_page,
            commands::ocr::pdf_ocr_export,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
