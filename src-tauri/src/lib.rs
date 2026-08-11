mod commands;
mod go_model;
mod result;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
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
