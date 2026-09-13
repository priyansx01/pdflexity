mod commands;
mod go_bridge;
mod go_model;
mod pdf_ops;
mod result;
mod util;

use go_bridge::BridgeHolder;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, WindowEvent};

/// Bring the main window back from the tray.
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
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

            // System tray: keeps the app alive when the window is hidden so
            // background jobs keep running. Menu: Show / Quit.
            let show_item = MenuItem::with_id(app, "show", "Show PDFlexity", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("PDFlexity")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => {
                        // Let the renderer confirm / persist, then it calls quit_app.
                        show_main_window(app);
                        let _ = app.emit("app:quit-requested", ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            // Show the main window now (config sets visible:false to avoid a
            // white flash before the webview is ready). Frameless window — the
            // renderer draws its own TitleBar (drag region via data-tauri-drag-region).
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        // Closing the window (TitleBar ✕ / Alt+F4) hides it to the tray instead
        // of quitting, so loaded work and in-flight jobs survive. Real exit goes
        // through the `quit_app` command after the renderer's confirm/save flow.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // App
            commands::app::app_get_platform,
            commands::app::app_get_version,
            commands::app::open_external,
            commands::app::quit_app,
            // Feature packs (on-demand OCR install)
            commands::features::feature_status,
            commands::features::feature_install,
            commands::features::feature_uninstall,
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
            // Compression (pure Rust)
            commands::compress::pdf_compress,
            // Rotation (pure Rust)
            commands::rotate::pdf_rotate,
            // Repair (Go engine / pdfcpu)
            commands::repair::pdf_repair,
            // PDF editor (fitz worker)
            commands::edit::pdf_edit_extract,
            commands::edit::pdf_edit_apply,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
