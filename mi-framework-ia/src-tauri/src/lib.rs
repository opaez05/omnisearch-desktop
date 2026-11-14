pub mod domain;
pub mod ports;
pub mod adapters;
pub mod application;
pub mod commands;

use application::SemanticExplorerApp;
use commands::{hide_main_to_tray, show_main_window, AppConfigState, AppState};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, Position, Rect, Size, WindowEvent,
};

const SINGLE_INSTANCE_ADDR: &str = "127.0.0.1:47831";

/// Verifica si ya existe una instancia ejecutándose. Si existe, le envía la señal para enfocar la ventana y termina.
fn ensure_single_instance() -> Option<TcpListener> {
    match TcpListener::bind(SINGLE_INSTANCE_ADDR) {
        Ok(listener) => Some(listener),
        Err(_) => {
            if let Ok(mut stream) = TcpStream::connect(SINGLE_INSTANCE_ADDR) {
                let _ = stream.write_all(b"FOCUS_MAIN");
            }
            None
        }
    }
}

/// Posiciona y alterna la visibilidad del popup `tray-popup` (360x500) pegado al icono de la bandeja
fn toggle_tray_popup(app: &AppHandle, tray_rect: Rect) {
    let Some(popup) = app.get_webview_window("tray-popup") else {
        return;
    };

    if popup.is_visible().unwrap_or(false) {
        let _ = popup.hide();
        return;
    }

    let popup_width: i32 = 360;
    let popup_height: i32 = 500;

    let (icon_x, icon_y) = match tray_rect.position {
        Position::Physical(pos) => (pos.x, pos.y),
        Position::Logical(pos) => (pos.x as i32, pos.y as i32),
    };
    let (icon_w, icon_h) = match tray_rect.size {
        Size::Physical(sz) => (sz.width as i32, sz.height as i32),
        Size::Logical(sz) => (sz.width as i32, sz.height as i32),
    };

    if icon_x != 0 || icon_y != 0 {
        let target_x = (icon_x + (icon_w / 2) - (popup_width / 2)).max(12);
        // Si el icono está en la parte inferior (barra de tareas de Windows), abrimos el popup arriba del icono.
        // Si está en la barra superior (macOS / GNOME), lo abrimos debajo del icono.
        let target_y = if icon_y > popup_height + 40 {
            icon_y - popup_height - 8
        } else {
            icon_y + icon_h + 8
        };
        let _ = popup.set_position(Position::Physical(PhysicalPosition::new(
            target_x, target_y,
        )));
    } else {
        let _ = popup.center();
    }

    let _ = popup.show();
    let _ = popup.set_focus();
}

/// Construye el icono de la bandeja del sistema, su menú contextual (clic derecho) y el popup (clic izquierdo)
fn setup_system_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_main_item = MenuItem::with_id(
        app,
        "open_main",
        "Abrir app completa",
        true,
        None::<&str>,
    )?;
    let quick_popup_item = MenuItem::with_id(
        app,
        "toggle_popup",
        "Búsqueda rápida (Popup)",
        true,
        None::<&str>,
    )?;
    let rescan_item = MenuItem::with_id(
        app,
        "rescan_now",
        "Re-escanear carpeta ahora",
        true,
        None::<&str>,
    )?;
    let settings_item = MenuItem::with_id(
        app,
        "open_settings",
        "Configuración",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit_app", "Salir", true, None::<&str>)?;

    let tray_menu = Menu::with_items(
        app,
        &[
            &open_main_item,
            &quick_popup_item,
            &rescan_item,
            &settings_item,
            &separator,
            &quit_item,
        ],
    )?;

    let mut tray_builder = TrayIconBuilder::with_id("omnisearch-tray")
        .tooltip("OmniSearch Desktop — Explorador Semántico Local")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
            "open_main" => {
                show_main_window(app_handle, Some("search"));
            }
            "toggle_popup" => {
                if let Some(popup) = app_handle.get_webview_window("tray-popup") {
                    let _ = popup.center();
                    let _ = popup.show();
                    let _ = popup.set_focus();
                }
            }
            "rescan_now" => {
                let handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let app_state = handle.state::<AppState>();
                    let cfg_state = handle.state::<AppConfigState>();
                    let folder = cfg_state
                        .config
                        .read()
                        .map(|c| c.indexed_folder.clone())
                        .unwrap_or_default();
                    let path = PathBuf::from(folder);
                    if let Ok(count) = app_state.0.index_directory(&path).await {
                        let _ = handle.emit("index-updated", count);
                    }
                });
            }
            "open_settings" => {
                show_main_window(app_handle, Some("settings"));
            }
            "quit_app" => {
                app_handle.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_tray_popup(tray.app_handle(), rect);
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    tray_builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Control de instancia única (Single-Instance)
    let Some(single_instance_listener) = ensure_single_instance() else {
        log::info!("Otra instancia de OmniSearch Desktop ya está en ejecución. Enfocando ventana existente.");
        return;
    };

    let app_instance = SemanticExplorerApp::new();
    let cfg_state = AppConfigState::load_or_default();
    let is_first_run = !cfg_state.is_setup_completed();

    tauri::Builder::default()
        .manage(AppState(app_instance))
        .manage(cfg_state)
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 2. Configurar el icono y menú de bandeja del sistema
            setup_system_tray(app)?;

            // 3. Escuchar solicitudes de enfoque desde intentos de abrir una segunda instancia
            let handle_for_ipc = app.handle().clone();
            std::thread::spawn(move || {
                for stream in single_instance_listener.incoming().flatten() {
                    let mut buf = [0u8; 32];
                    let mut s = stream;
                    let _ = s.read(&mut buf);
                    show_main_window(&handle_for_ipc, None);
                }
            });

            // 4. Primera ejecución vs. Ejecuciones posteriores
            if is_first_run {
                // Primera ejecución: mostrar ventana principal completa y visible en barra de tareas
                show_main_window(app.handle(), None);
            } else {
                // Ejecuciones posteriores: arrancar oculto viviendo únicamente en la bandeja del sistema
                hide_main_to_tray(app.handle());
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            match window.label() {
                "tray-popup" => {
                    // El popup 360x500 se oculta automáticamente al perder el foco
                    if let WindowEvent::Focused(false) = event {
                        let _ = window.hide();
                    }
                }
                "main" => {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let cfg_state = window.state::<AppConfigState>();
                        if cfg_state.is_setup_completed() {
                            // Si el setup ya se completó, pulsar la X oculta la ventana a la bandeja sin cerrar el proceso
                            api.prevent_close();
                            hide_main_to_tray(window.app_handle());
                        } else {
                            // Mientras la configuración inicial NO esté completa, no se oculta silenciosamente a la bandeja
                            api.prevent_close();
                            let _ = window.emit("setup-required-warning", true);
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_config,
            commands::complete_setup,
            commands::reset_setup,
            commands::set_autostart,
            commands::show_full_app,
            commands::hide_tray_popup,
            commands::search,
            commands::index_downloads,
            commands::index_folder,
            commands::get_default_folder,
            commands::pick_folder,
            commands::read_file_preview,
            commands::open_file_in_os,
            commands::get_indexed_count,
            commands::check_ollama_status,
            commands::ask_question,
            commands::ask_question_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
