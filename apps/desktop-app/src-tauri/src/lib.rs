#[cfg(target_os = "macos")]
fn center_traffic_lights(win: &tauri::WebviewWindow) {
    use objc2::encode::{Encode, Encoding, RefEncode};
    use objc2::msg_send;
    use objc2::runtime::AnyObject;

    // Mirror the C layout of NSPoint / NSSize / NSRect (= CGPoint / CGSize / CGRect on 64-bit)
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct Point {
        x: f64,
        y: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct Size {
        width: f64,
        height: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct Rect {
        origin: Point,
        size: Size,
    }

    unsafe impl Encode for Point {
        const ENCODING: Encoding = Encoding::Struct("CGPoint", &[f64::ENCODING, f64::ENCODING]);
    }
    unsafe impl RefEncode for Point {
        const ENCODING_REF: Encoding = Encoding::Pointer(&Self::ENCODING);
    }
    unsafe impl Encode for Size {
        const ENCODING: Encoding = Encoding::Struct("CGSize", &[f64::ENCODING, f64::ENCODING]);
    }
    unsafe impl RefEncode for Size {
        const ENCODING_REF: Encoding = Encoding::Pointer(&Self::ENCODING);
    }
    unsafe impl Encode for Rect {
        const ENCODING: Encoding = Encoding::Struct(
            "CGRect",
            &[
                Encoding::Struct("CGPoint", &[f64::ENCODING, f64::ENCODING]),
                Encoding::Struct("CGSize", &[f64::ENCODING, f64::ENCODING]),
            ],
        );
    }
    unsafe impl RefEncode for Rect {
        const ENCODING_REF: Encoding = Encoding::Pointer(&Self::ENCODING);
    }

    // Toolbar height 38px, traffic light buttons ~12px tall
    // Vertical center = (38 - 12) / 2 = 13.0 from top
    let target_y: f64 = 13.0;
    let x_start: f64 = 8.0;

    let ns_window: *mut AnyObject = win.ns_window().unwrap() as *mut AnyObject;
    unsafe {
        // NSWindowButton values: 0=close, 1=miniaturize, 2=zoom
        let mut offset_x = x_start;
        for btn_idx in 0usize..3 {
            let btn: *mut AnyObject = msg_send![ns_window, standardWindowButton: btn_idx];
            if btn.is_null() {
                continue;
            }
            let frame: Rect = msg_send![btn, frame];
            let superview: *mut AnyObject = msg_send![btn, superview];
            let sv_frame: Rect = msg_send![superview, frame];
            // macOS coords: origin is bottom-left → flip y axis
            let flipped_y = sv_frame.size.height - target_y - frame.size.height;
            let new_frame = Rect {
                origin: Point {
                    x: offset_x,
                    y: flipped_y,
                },
                size: frame.size,
            };
            let _: () = msg_send![btn, setFrame: new_frame];
            offset_x += frame.size.width + 6.0;
        }
    }
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let dir = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_plugin_liquid_glass::init());
    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                use tauri_plugin_liquid_glass::{LiquidGlassConfig, LiquidGlassExt};
                if let Some(win) = _app.get_webview_window("main") {
                    _app.liquid_glass()
                        .set_effect(&win, LiquidGlassConfig::default())
                        .ok();
                    center_traffic_lights(&win);
                }
            }
            #[cfg(target_os = "macos")]
            {
                let app = _app;
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                // ── File Viewers (app menu) ───────────────────────────
                let about = PredefinedMenuItem::about(app, None, None)?;
                let sep1 = PredefinedMenuItem::separator(app)?;
                let services = PredefinedMenuItem::services(app, None)?;
                let sep2 = PredefinedMenuItem::separator(app)?;
                let hide = PredefinedMenuItem::hide(app, None)?;
                let hide_other = PredefinedMenuItem::hide_others(app, None)?;
                let show_all = PredefinedMenuItem::show_all(app, None)?;
                let sep3 = PredefinedMenuItem::separator(app)?;
                let quit = PredefinedMenuItem::quit(app, None)?;
                let app_menu = Submenu::with_items(
                    app,
                    "File Viewers",
                    true,
                    &[
                        &about,
                        &sep1,
                        &services,
                        &sep2,
                        &hide,
                        &hide_other,
                        &show_all,
                        &sep3,
                        &quit,
                    ],
                )?;

                // ── File ─────────────────────────────────────────────
                let open = MenuItem::with_id(app, "open", "Open…", true, Some("cmd+o"))?;
                let sep4 = PredefinedMenuItem::separator(app)?;
                let new_tab = MenuItem::with_id(app, "new-tab", "New Tab", true, Some("cmd+t"))?;
                let close_tab =
                    MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("cmd+w"))?;
                let sep5 = PredefinedMenuItem::separator(app)?;
                let save = MenuItem::with_id(app, "save", "Save", true, Some("cmd+s"))?;
                let sep6 = PredefinedMenuItem::separator(app)?;
                let settings = MenuItem::with_id(app, "settings", "Settings", true, Some("cmd+,"))?;
                let file_menu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[
                        &open, &sep4, &new_tab, &close_tab, &sep5, &save, &sep6, &settings,
                    ],
                )?;

                // ── Edit ─────────────────────────────────────────────
                let undo = PredefinedMenuItem::undo(app, None)?;
                let redo = PredefinedMenuItem::redo(app, None)?;
                let sep5 = PredefinedMenuItem::separator(app)?;
                let cut = PredefinedMenuItem::cut(app, None)?;
                let copy = PredefinedMenuItem::copy(app, None)?;
                let paste = PredefinedMenuItem::paste(app, None)?;
                let select_all = PredefinedMenuItem::select_all(app, None)?;
                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[&undo, &redo, &sep5, &cut, &copy, &paste, &select_all],
                )?;

                // ── View ─────────────────────────────────────────────
                let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;
                let view_menu = Submenu::with_items(app, "View", true, &[&fullscreen])?;

                // ── Window ───────────────────────────────────────────
                let minimize = PredefinedMenuItem::minimize(app, None)?;
                let zoom = PredefinedMenuItem::maximize(app, None)?;
                let win_menu = Submenu::with_items(app, "Window", true, &[&minimize, &zoom])?;

                // ── Help ─────────────────────────────────────────────
                let toggle_devtools = MenuItem::with_id(
                    app,
                    "toggle-devtools",
                    "Toggle Developer Tools",
                    true,
                    Some("cmd+shift+i"),
                )?;
                let clear_storage = MenuItem::with_id(
                    app,
                    "clear-storage",
                    "Clear All localStorage",
                    true,
                    None::<&str>,
                )?;
                let help_menu =
                    Submenu::with_items(app, "Help", true, &[&toggle_devtools, &clear_storage])?;
                let menu = Menu::with_items(
                    app,
                    &[
                        &app_menu, &file_menu, &edit_menu, &view_menu, &win_menu, &help_menu,
                    ],
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
            if event.id() == "save" {
                app.emit("menu-save", ()).ok();
            }
            if event.id() == "settings" {
                app.emit("menu-settings", ()).ok();
            }
            if event.id() == "toggle-devtools" {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_devtools_open() {
                        win.close_devtools();
                    } else {
                        win.open_devtools();
                    }
                }
            }
            if event.id() == "clear-storage" {
                app.emit("menu-clear-storage", ()).ok();
            }
        })
        .invoke_handler(tauri::generate_handler![reveal_in_finder])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                use tauri::Emitter;
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|url| {
                        url.to_file_path()
                            .ok()
                            .and_then(|p| p.to_str().map(|s| s.to_string()))
                    })
                    .collect();
                if !paths.is_empty() {
                    app_handle.emit("open-with-files", paths).ok();
                }
            }
        });
}
