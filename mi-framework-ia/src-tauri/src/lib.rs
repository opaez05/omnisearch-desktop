pub mod domain;
pub mod ports;
pub mod adapters;
pub mod application;
pub mod commands;

use application::SemanticExplorerApp;
use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app_instance = SemanticExplorerApp::new();

  tauri::Builder::default()
    .manage(AppState(app_instance))
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
        commands::search,
        commands::index_downloads,
        commands::get_indexed_count,
        commands::check_ollama_status,
        commands::ask_question
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
