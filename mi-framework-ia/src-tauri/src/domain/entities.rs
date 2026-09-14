use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileItem {
    pub id: String,
    pub path: String,
    pub sha256_hash: String,
    pub mime_type: String,
    pub file_size: u64,
    pub indexed_at: u64, // Unix timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub text: String,
    pub limit: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub file_item: FileItem,
    pub score: f32,
    pub relevant_snippet: String,
    pub metadata: std::collections::HashMap<String, String>,
}
