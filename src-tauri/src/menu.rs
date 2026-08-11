//! Native application menu — Rust port of `apps/electron/src/menu.ts`.
//!
//! Edit / View / Help submenus. Tauri injects the platform-standard App and
//! Window menus automatically on macOS, so we only add the app-specific ones.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager};

/// Build and install the application menu. Non-fatal: a failure is logged but
/// the app keeps running.
pub fn build(app: &AppHandle) {
    if let Err(e) = try_build(app) {
        log::warn!("Failed to build native menu: {e:#}");
    }
}

fn try_build(app: &AppHandle) -> anyhow::Result<()> {
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let reload = MenuItem::with_id(app, "reload", "Reload", true, None::<&str>)?;
    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &reload,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let docs = MenuItem::with_id(app, "docs", "Documentation", true, None::<&str>)?;
    let help = Submenu::with_items(app, "Help", true, &[&docs])?;

    let menu = Menu::with_items(app, &[&edit, &view, &help])?;
    app.set_menu(menu)?;

    app.on_menu_event(|app, event| match event.id().as_ref() {
        "reload" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.reload();
            }
        }
        "docs" => {
            let _ = open::that("https://github.com/priyansx01/pdflexity");
        }
        _ => {}
    });

    Ok(())
}
