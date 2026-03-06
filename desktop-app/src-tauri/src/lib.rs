#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_liquid_glass::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(win) = _app.get_webview_window("main") {
                    win.open_devtools();
                }
            }
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                use tauri_plugin_liquid_glass::{LiquidGlassConfig, LiquidGlassExt};
                if let Some(win) = _app.get_webview_window("main") {
                    _app.liquid_glass()
                        .set_effect(&win, LiquidGlassConfig::default())
                        .ok();
                }
            }
            #[cfg(target_os = "macos")]
            {
                let app = _app;
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                // ── File Viewers (app menu) ───────────────────────────
                let about      = PredefinedMenuItem::about(app, None, None)?;
                let sep1       = PredefinedMenuItem::separator(app)?;
                let services   = PredefinedMenuItem::services(app, None)?;
                let sep2       = PredefinedMenuItem::separator(app)?;
                let hide       = PredefinedMenuItem::hide(app, None)?;
                let hide_other = PredefinedMenuItem::hide_others(app, None)?;
                let show_all   = PredefinedMenuItem::show_all(app, None)?;
                let sep3       = PredefinedMenuItem::separator(app)?;
                let quit       = PredefinedMenuItem::quit(app, None)?;
                let app_menu   = Submenu::with_items(
                    app, "File Viewers", true,
                    &[&about, &sep1, &services, &sep2,
                      &hide, &hide_other, &show_all, &sep3, &quit],
                )?;

                // ── File ─────────────────────────────────────────────
                let open      = MenuItem::with_id(app, "open", "Open…", true, Some("cmd+o"))?;
                let sep4      = PredefinedMenuItem::separator(app)?;
                let new_tab   = MenuItem::with_id(app, "new-tab", "New Tab", true, Some("cmd+t"))?;
                let close_tab = MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("cmd+w"))?;
                let file_menu = Submenu::with_items(
                    app, "File", true,
                    &[&open, &sep4, &new_tab, &close_tab],
                )?;

                // ── Edit ─────────────────────────────────────────────
                let undo       = PredefinedMenuItem::undo(app, None)?;
                let redo       = PredefinedMenuItem::redo(app, None)?;
                let sep5       = PredefinedMenuItem::separator(app)?;
                let cut        = PredefinedMenuItem::cut(app, None)?;
                let copy       = PredefinedMenuItem::copy(app, None)?;
                let paste      = PredefinedMenuItem::paste(app, None)?;
                let select_all = PredefinedMenuItem::select_all(app, None)?;
                let edit_menu  = Submenu::with_items(
                    app, "Edit", true,
                    &[&undo, &redo, &sep5, &cut, &copy, &paste, &select_all],
                )?;

                // ── View ─────────────────────────────────────────────
                let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;
                let view_menu  = Submenu::with_items(app, "View", true, &[&fullscreen])?;

                // ── Window ───────────────────────────────────────────
                let minimize = PredefinedMenuItem::minimize(app, None)?;
                let zoom     = PredefinedMenuItem::maximize(app, None)?;
                let win_menu = Submenu::with_items(
                    app, "Window", true,
                    &[&minimize, &zoom],
                )?;

                let menu = Menu::with_items(
                    app,
                    &[&app_menu, &file_menu, &edit_menu, &view_menu, &win_menu],
                )?;
                app.set_menu(menu)?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            use tauri::Emitter;
            if event.id() == "open" {
                app.emit("menu-open-file", ()).ok();
            }
            if event.id() == "close-tab" {
                app.emit("menu-close-tab", ()).ok();
            }
            if event.id() == "new-tab" {
                app.emit("menu-new-tab", ()).ok();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
