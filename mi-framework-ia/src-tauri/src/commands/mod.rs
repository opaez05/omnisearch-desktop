use crate::application::SemanticExplorerApp;
use crate::domain::entities::{SearchQuery, SearchResult};
use tauri::{command, State};

pub struct AppState(pub SemanticExplorerApp);

#[command]
pub async fn index_downloads(state: State<'_, AppState>) -> Result<usize, String> {
    state.0.index_downloads_folder().await.map_err(|e| e.to_string())
}

#[command]
pub async fn search(query: SearchQuery, state: State<'_, AppState>) -> Result<Vec<SearchResult>, String> {
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
