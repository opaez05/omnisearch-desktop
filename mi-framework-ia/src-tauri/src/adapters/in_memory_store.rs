use crate::ports::VectorStorePort;
use crate::domain::entities::{FileItem, SearchResult};
use crate::domain::error::Result;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

#[derive(Clone)]
struct StoredDocument {
    file_item: FileItem,
    embedding: Vec<f32>,
    snippet: String,
    metadata: HashMap<String, String>,
}

#[derive(Clone)]
pub struct InMemoryVectorStore {
    documents: Arc<RwLock<HashMap<String, StoredDocument>>>,
}

impl InMemoryVectorStore {
    pub fn new() -> Self {
        Self {
            documents: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn upsert_with_snippet(&self, id: &str, embedding: Vec<f32>, metadata: &FileItem, snippet: String) -> Result<()> {
        let mut docs = self.documents.write().map_err(|e| crate::domain::error::FrameworkError::VectorStoreError(e.to_string()))?;
        
        let stored = StoredDocument {
            file_item: metadata.clone(),
            embedding,
            snippet,
            metadata: HashMap::new(),
        };

        docs.insert(id.to_string(), stored);
        Ok(())
    }

    pub fn clear(&self) -> Result<()> {
        let mut docs = self.documents.write().map_err(|e| crate::domain::error::FrameworkError::VectorStoreError(e.to_string()))?;
        docs.clear();
        Ok(())
    }

    pub fn len(&self) -> usize {
        if let Ok(docs) = self.documents.read() {
            docs.len()
        } else {
            0
        }
    }

    pub fn search_keyword(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        let docs = match self.documents.read() {
            Ok(d) => d,
            Err(_) => return Vec::new(),
        };

        let query_lower = query.to_lowercase();
        let query_terms: Vec<&str> = query_lower.split_whitespace().collect();

        let mut scored_results: Vec<(f32, SearchResult)> = Vec::new();

        for doc in docs.values() {
            let path_lower = doc.file_item.path.to_lowercase();
            let snippet_lower = doc.snippet.to_lowercase();

            let mut hits = 0;
            for term in &query_terms {
                if path_lower.contains(term) || snippet_lower.contains(term) {
                    hits += 1;
                }
            }

            if hits > 0 || query.trim().is_empty() {
                let score = if query_terms.is_empty() {
                    1.0
                } else {
                    hits as f32 / query_terms.len() as f32
                };

                // Find a relevant snippet preview around matching term
                let preview = if let Some(pos) = snippet_lower.find(&query_lower) {
                    let start = pos.saturating_sub(40);
                    let end = (pos + query_lower.len() + 80).min(doc.snippet.len());
                    format!("...{}...", &doc.snippet[start..end])
                } else {
                    doc.snippet.chars().take(120).collect::<String>()
                };

                scored_results.push((
                    score,
                    SearchResult {
                        file_item: doc.file_item.clone(),
                        score,
                        relevant_snippet: preview,
                        metadata: doc.metadata.clone(),
                    },
                ));
            }
        }

        // Sort descending by score
        scored_results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        scored_results.into_iter().map(|(_, res)| res).take(limit).collect()
    }
}

impl VectorStorePort for InMemoryVectorStore {
    fn upsert(&self, id: &str, embedding: Vec<f32>, metadata: &FileItem) -> Result<()> {
        self.upsert_with_snippet(id, embedding, metadata, String::new())
    }

    fn search_cosine(&self, query_embedding: Vec<f32>, limit: usize) -> Result<Vec<SearchResult>> {
        let docs = self.documents.read().map_err(|e| crate::domain::error::FrameworkError::VectorStoreError(e.to_string()))?;

        let mut scored_results: Vec<(f32, SearchResult)> = Vec::new();

        for doc in docs.values() {
            let score = cosine_similarity(&query_embedding, &doc.embedding);
            scored_results.push((
                score,
                SearchResult {
                    file_item: doc.file_item.clone(),
                    score,
                    relevant_snippet: doc.snippet.clone(),
                    metadata: doc.metadata.clone(),
                },
            ));
        }

        scored_results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        Ok(scored_results.into_iter().map(|(_, res)| res).take(limit).collect())
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a.sqrt() * norm_b.sqrt())
    }
}
