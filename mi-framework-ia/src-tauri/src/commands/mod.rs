use crate::application::SemanticExplorerApp;
use crate::domain::entities::{SearchQuery, SearchResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, RwLock};
use tauri::{command, AppHandle, Emitter, Manager, State, Window};

pub struct AppState(pub SemanticExplorerApp);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub setup_completed: bool,
    pub autostart: bool,
    pub indexed_folder: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            setup_completed: false,
            autostart: false,
            indexed_folder: SemanticExplorerApp::default_docs_folder(),
        }
    }
}

#[derive(Clone)]
pub struct AppConfigState {
    pub config: Arc<RwLock<AppConfig>>,
    pub config_path: PathBuf,
}

impl AppConfigState {
    pub fn load_or_default() -> Self {
        let config_path = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("omnisearch-desktop")
            .join("app_config.json");

        let config = if config_path.exists() {
            fs::read(&config_path)
                .ok()
                .and_then(|bytes| serde_json::from_slice::<AppConfig>(&bytes).ok())
                .unwrap_or_default()
        } else {
            AppConfig::default()
        };

        Self {
            config: Arc::new(RwLock::new(config)),
            config_path,
        }
    }

    pub fn save(&self) -> Result<AppConfig, String> {
        let cfg = self
            .config
            .read()
            .map_err(|e| format!("Error leyendo configuración: {}", e))?
            .clone();

        if let Some(parent) = self.config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let bytes = serde_json::to_vec_pretty(&cfg)
            .map_err(|e| format!("Error serializando configuración: {}", e))?;
        fs::write(&self.config_path, bytes)
            .map_err(|e| format!("Error guardando configuración: {}", e))?;
        Ok(cfg)
    }

    pub fn is_setup_completed(&self) -> bool {
        self.config
            .read()
            .map(|c| c.setup_completed)
            .unwrap_or(false)
    }
}

/// Muestra y enfoca la ventana principal completa (`main`), restaurando el icono del Dock en macOS
pub fn show_main_window(app: &AppHandle, section: Option<&str>) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }

    if let Some(popup) = app.get_webview_window("tray-popup") {
        let _ = popup.hide();
    }

    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.unminimize();
        let _ = main_win.set_focus();
    }

    if let Some(sec) = section {
        let _ = app.emit("navigate-section", sec);
    }
}

/// Oculta la ventana principal hacia la bandeja del sistema y oculta el icono del Dock en macOS
pub fn hide_main_to_tray(app: &AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }
}

#[derive(Serialize)]
pub struct FilePreviewPayload {
    pub kind: String,
    pub mime_type: String,
    pub content: String,
    pub truncated: bool,
}

#[command]
pub async fn get_app_config(cfg_state: State<'_, AppConfigState>) -> Result<AppConfig, String> {
    cfg_state
        .config
        .read()
        .map(|c| c.clone())
        .map_err(|e| e.to_string())
}

/// Finaliza la configuración inicial, persiste `setup_completed = true` y hace la transición al modo bandeja
#[command]
pub async fn complete_setup(
    hide_to_tray: bool,
    app: AppHandle,
    cfg_state: State<'_, AppConfigState>,
) -> Result<AppConfig, String> {
    {
        let mut cfg = cfg_state.config.write().map_err(|e| e.to_string())?;
        cfg.setup_completed = true;
    }
    let updated = cfg_state.save()?;
    let _ = app.emit("config-updated", &updated);

    if hide_to_tray {
        hide_main_to_tray(&app);
        if let Some(popup) = app.get_webview_window("tray-popup") {
            let _ = popup.center();
            let _ = popup.show();
            let _ = popup.set_focus();
        }
    }

    Ok(updated)
}

/// Permite reiniciar el flag `setup_completed = false` para volver a probar la Primera Ejecución
#[command]
pub async fn reset_setup(
    app: AppHandle,
    cfg_state: State<'_, AppConfigState>,
) -> Result<AppConfig, String> {
    {
        let mut cfg = cfg_state.config.write().map_err(|e| e.to_string())?;
        cfg.setup_completed = false;
    }
    let updated = cfg_state.save()?;
    let _ = app.emit("config-updated", &updated);
    show_main_window(&app, None);
    Ok(updated)
}

/// Activa o desactiva el inicio automático con el sistema operativo
#[command]
pub async fn set_autostart(
    enabled: bool,
    app: AppHandle,
    cfg_state: State<'_, AppConfigState>,
) -> Result<AppConfig, String> {
    apply_os_autostart(enabled)?;
    {
        let mut cfg = cfg_state.config.write().map_err(|e| e.to_string())?;
        cfg.autostart = enabled;
    }
    let updated = cfg_state.save()?;
    let _ = app.emit("config-updated", &updated);
    Ok(updated)
}

#[command]
pub async fn show_full_app(section: Option<String>, app: AppHandle) -> Result<(), String> {
    show_main_window(&app, section.as_deref());
    Ok(())
}

#[command]
pub async fn hide_tray_popup(app: AppHandle) -> Result<(), String> {
    if let Some(popup) = app.get_webview_window("tray-popup") {
        let _ = popup.hide();
    }
    Ok(())
}

#[command]
pub async fn index_downloads(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let count = state
        .0
        .index_downloads_folder()
        .await
        .map_err(|e| e.to_string())?;
    let _ = app.emit("index-updated", count);
    Ok(count)
}

#[command]
pub async fn index_folder(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
    cfg_state: State<'_, AppConfigState>,
) -> Result<usize, String> {
    let count = state
        .0
        .index_directory(Path::new(&path))
        .await
        .map_err(|e| e.to_string())?;

    if let Ok(mut cfg) = cfg_state.config.write() {
        cfg.indexed_folder = path;
    }
    if let Ok(updated) = cfg_state.save() {
        let _ = app.emit("config-updated", &updated);
    }
    let _ = app.emit("index-updated", count);
    Ok(count)
}

#[command]
pub async fn get_default_folder(cfg_state: State<'_, AppConfigState>) -> Result<String, String> {
    if let Ok(cfg) = cfg_state.config.read() {
        if !cfg.indexed_folder.is_empty() {
            return Ok(cfg.indexed_folder.clone());
        }
    }
    Ok(SemanticExplorerApp::default_docs_folder())
}

#[command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = 'Selecciona una carpeta para indexar localmente con OmniSearch'
$dlg.ShowNewFolderButton = $false
if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dlg.SelectedPath
}
"#;
        let output = Command::new("powershell")
            .args(["-NoProfile", "-STA", "-Command", script])
            .output()
            .map_err(|e| format!("No se pudo abrir el selector de carpetas: {}", e))?;
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(if selected.is_empty() { None } else { Some(selected) });
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("osascript")
            .args([
                "-e",
                "POSIX path of (choose folder with prompt \"Selecciona una carpeta para OmniSearch\")",
            ])
            .output()
            .map_err(|e| format!("No se pudo abrir el selector de carpetas: {}", e))?;
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(if selected.is_empty() { None } else { Some(selected) });
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("zenity")
            .args(["--file-selection", "--directory", "--title=Selecciona una carpeta"])
            .output()
            .map_err(|e| format!("Instala zenity o escribe la ruta manualmente: {}", e))?;
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(if selected.is_empty() { None } else { Some(selected) });
    }
}

#[command]
pub async fn read_file_preview(path: String) -> Result<FilePreviewPayload, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() || !file_path.is_file() {
        return Err(format!("El archivo no existe: {}", path));
    }

    let ext = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
    if ext == "pdf" {
        const MAX_PDF_PREVIEW_BYTES: u64 = 25 * 1024 * 1024;
        if metadata.len() > MAX_PDF_PREVIEW_BYTES {
            return Err("El PDF supera 25 MB para vista previa embebida. Usa 'Abrir en el sistema'.".to_string());
        }
        let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
        return Ok(FilePreviewPayload {
            kind: "pdf".to_string(),
            mime_type: "application/pdf".to_string(),
            content: encode_base64(&bytes),
            truncated: false,
        });
    }

    const MAX_TEXT_PREVIEW_BYTES: usize = 256 * 1024;
    let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    let truncated = bytes.len() > MAX_TEXT_PREVIEW_BYTES;
    let slice = if truncated {
        &bytes[..MAX_TEXT_PREVIEW_BYTES]
    } else {
        &bytes[..]
    };

    Ok(FilePreviewPayload {
        kind: "text".to_string(),
        mime_type: "text/plain".to_string(),
        content: String::from_utf8_lossy(slice).to_string(),
        truncated,
    })
}

#[command]
pub async fn open_file_in_os(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("Archivo no encontrado: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub async fn search(
    query: SearchQuery,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let results = state.0.search(&query.text, query.limit).await;
    Ok(results)
}

#[command]
pub async fn get_indexed_count(state: State<'_, AppState>) -> Result<usize, String> {
    Ok(state.0.get_total_indexed())
}

#[command]
pub async fn check_ollama_status(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.0.check_ollama_health().await)
}

#[command]
pub async fn ask_question(query: String, state: State<'_, AppState>) -> Result<String, String> {
    state.0.ask_question(&query).await.map_err(|e| e.to_string())
}

#[command]
pub async fn ask_question_stream(
    query: String,
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let results = state.0.search(&query, 4).await;
    let _ = window.emit("rag-sources", &results);

    let (_used_results, _full_text) = state
        .0
        .ask_question_stream(&query, |token| {
            let _ = window.emit("rag-token", token);
        })
        .await
        .map_err(|e| e.to_string())?;

    let _ = window.emit("rag-done", true);
    Ok(results)
}

fn apply_os_autostart(enabled: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("No se pudo obtener la ruta del ejecutable: {}", e))?;
    let exe_str = exe_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let reg_key = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
        if enabled {
            let quoted = format!("\"{}\"", exe_str);
            Command::new("reg")
                .args([
                    "add",
                    reg_key,
                    "/v",
                    "OmniSearchDesktop",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &quoted,
                    "/f",
                ])
                .output()
                .map_err(|e| format!("Error registrando autostart en Windows: {}", e))?;
        } else {
            let _ = Command::new("reg")
                .args(["delete", reg_key, "/v", "OmniSearchDesktop", "/f"])
                .output();
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            let plist_path = home
                .join("Library/LaunchAgents")
                .join("com.miframework.semanticexplorer.plist");
            if enabled {
                if let Some(parent) = plist_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let plist = format!(
                    r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.miframework.semanticexplorer</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>"#,
                    exe_str
                );
                fs::write(plist_path, plist).map_err(|e| e.to_string())?;
            } else if plist_path.exists() {
                let _ = fs::remove_file(plist_path);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(cfg_dir) = dirs::config_dir() {
            let desktop_path = cfg_dir
                .join("autostart")
                .join("omnisearch-desktop.desktop");
            if enabled {
                if let Some(parent) = desktop_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let entry = format!(
                    "[Desktop Entry]\nType=Application\nName=OmniSearch Desktop\nExec=\"{}\"\nTerminal=false\n",
                    exe_str
                );
                fs::write(desktop_path, entry).map_err(|e| e.to_string())?;
            } else if desktop_path.exists() {
                let _ = fs::remove_file(desktop_path);
            }
        }
    }

    Ok(())
}

fn encode_base64(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(((input.len() + 2) / 3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };

        out.push(TABLE[(b0 >> 2) & 0x3F] as char);
        out.push(TABLE[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0F)] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((b1 & 0x0F) << 2) | ((b2 >> 6) & 0x03)] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[b2 & 0x3F] as char
        } else {
            '='
        });
    }
    out
}
