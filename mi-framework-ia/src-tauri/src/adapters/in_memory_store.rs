use crate::ports::VectorStorePort;
use crate::domain::entities::{FileItem, SearchResult};
use crate::domain::error::{Result, FrameworkError};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::sync::{Arc, RwLock};

#[derive(Clone, Serialize, Deserialize)]
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

    pub fn upsert_with_snippet(
        &self,
        id: &str,
        embedding: Vec<f32>,
        metadata: &FileItem,
        snippet: String,
    ) -> Result<()> {
        self.upsert_with_extra(id, embedding, metadata, snippet, HashMap::new())
    }

    pub fn upsert_with_extra(
        &self,
        id: &str,
        embedding: Vec<f32>,
        metadata: &FileItem,
        snippet: String,
        extra_meta: HashMap<String, String>,
    ) -> Result<()> {
        let mut docs = self
            .documents
            .write()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;

        let stored = StoredDocument {
            file_item: metadata.clone(),
            embedding: normalize_l2(embedding),
            snippet,
            metadata: extra_meta,
        };

        docs.insert(id.to_string(), stored);
        Ok(())
    }

    /// Verifica si un archivo con este hash SHA-256 ya tiene chunks indexados con vectores válidos
    pub fn has_valid_file_hash(&self, sha256_hash: &str) -> bool {
        if let Ok(docs) = self.documents.read() {
            docs.values().any(|doc| {
                doc.file_item.sha256_hash == sha256_hash
                    && doc.embedding.iter().any(|&v| v.abs() > f32::EPSILON)
            })
        } else {
            false
        }
    }

    /// Elimina chunks de archivos que ya no existen o cuyo hash cambió
    pub fn retain_file_hashes(&self, active_hashes: &HashSet<String>) -> Result<()> {
        let mut docs = self
            .documents
            .write()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
        docs.retain(|_, doc| active_hashes.contains(&doc.file_item.sha256_hash));
        Ok(())
    }

    /// Guarda el índice vectorial en disco local para arranque instantáneo sin re-indexar
    pub fn save_to_disk(&self, path: &Path) -> Result<()> {
        let docs = self
            .documents
            .read()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let serialized = serde_json::to_vec(&*docs)
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
        fs::write(path, serialized)?;
        Ok(())
    }

    /// Carga el índice vectorial desde disco local si existe
    pub fn load_from_disk(&self, path: &Path) -> Result<usize> {
        if !path.exists() {
            return Ok(0);
        }
        let bytes = fs::read(path)?;
        let loaded: HashMap<String, StoredDocument> = serde_json::from_slice(&bytes)
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
        let count = loaded.len();
        let mut docs = self
            .documents
            .write()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
        *docs = loaded;
        Ok(count)
    }

    pub fn clear(&self) -> Result<()> {
        let mut docs = self
            .documents
            .write()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;
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
        let query_terms: Vec<&str> = query_lower
            .split_whitespace()
            .filter(|t| !t.is_empty())
            .collect();

        let mut scored_results: Vec<(f32, SearchResult)> = Vec::new();

        for (chunk_key, doc) in docs.iter() {
            let path_lower = doc.file_item.path.to_lowercase();
            let snippet_lower = doc.snippet.to_lowercase();

            let mut hits = 0usize;
            let mut exact_phrase_bonus = 0.0f32;

            if !query_lower.is_empty() && snippet_lower.contains(&query_lower) {
                exact_phrase_bonus = 0.25;
            }

            for term in &query_terms {
                if path_lower.contains(term) || snippet_lower.contains(term) {
                    hits += 1;
                }
            }

            if hits > 0 || query.trim().is_empty() {
                let base_score = if query_terms.is_empty() {
                    1.0
                } else {
                    (hits as f32 / query_terms.len() as f32 + exact_phrase_bonus).min(0.99)
                };

                let preview = if !query_lower.is_empty() {
                    if let Some(pos) = snippet_lower.find(&query_lower) {
                        safe_slice_around(&doc.snippet, pos, query_lower.len())
                    } else if let Some(first_term) = query_terms.iter().find(|&&t| snippet_lower.contains(t)) {
                        if let Some(pos) = snippet_lower.find(first_term) {
                            safe_slice_around(&doc.snippet, pos, first_term.len())
                        } else {
                            doc.snippet.chars().take(180).collect::<String>()
                        }
                    } else {
                        doc.snippet.chars().take(180).collect::<String>()
                    }
                } else {
                    doc.snippet.chars().take(180).collect::<String>()
                };

                let mut meta = doc.metadata.clone();
                meta.insert("chunk_id".to_string(), chunk_key.clone());
                meta.entry("engine".to_string())
                    .or_insert_with(|| "TF-IDF Léxico Local".to_string());

                scored_results.push((
                    base_score,
                    SearchResult {
                        file_item: doc.file_item.clone(),
                        score: base_score,
                        relevant_snippet: preview,
                        metadata: meta,
                    },
                ));
            }
        }

        scored_results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        scored_results.into_iter().map(|(_, res)| res).take(limit).collect()
    }
}

impl VectorStorePort for InMemoryVectorStore {
    fn upsert(&self, id: &str, embedding: Vec<f32>, metadata: &FileItem) -> Result<()> {
        self.upsert_with_snippet(id, embedding, metadata, String::new())
    }

    fn search_cosine(&self, query_embedding: Vec<f32>, limit: usize) -> Result<Vec<SearchResult>> {
        let docs = self
            .documents
            .read()
            .map_err(|e| FrameworkError::VectorStoreError(e.to_string()))?;

        let norm_query = normalize_l2(query_embedding);
        let mut scored_results: Vec<(f32, SearchResult)> = Vec::with_capacity(docs.len());

        for (chunk_key, doc) in docs.iter() {
            let score = dot_product(&norm_query, &doc.embedding);
            if score <= 0.0 {
                continue;
            }
            let mut meta = doc.metadata.clone();
            meta.insert("chunk_id".to_string(), chunk_key.clone());
            meta.entry("engine".to_string())
                .or_insert_with(|| "Cosine Similarity · Embeddings".to_string());

            scored_results.push((
                score,
                SearchResult {
                    file_item: doc.file_item.clone(),
                    score,
                    relevant_snippet: doc.snippet.clone(),
                    metadata: meta,
                },
            ));
        }

        scored_results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        Ok(scored_results
            .into_iter()
            .map(|(_, res)| res)
            .take(limit)
            .collect())
    }
}

fn safe_slice_around(text: &str, pos: usize, match_len: usize) -> String {
    let mut start = pos.saturating_sub(50).min(text.len());
    while start > 0 && !text.is_char_boundary(start) {
        start -= 1;
    }
    let mut end = (pos + match_len + 110).min(text.len());
    while end < text.len() && !text.is_char_boundary(end) {
        end += 1;
    }
    let prefix = if start > 0 { "..." } else { "" };
    let suffix = if end < text.len() { "..." } else { "" };
    format!("{}{}{}", prefix, &text[start..end], suffix)
}

fn normalize_l2(mut vec: Vec<f32>) -> Vec<f32> {
    let norm_sq: f32 = vec.iter().map(|&x| x * x).sum();
    if norm_sq > 0.0 {
        let inv_norm = 1.0 / norm_sq.sqrt();
        for x in &mut vec {
            *x *= inv_norm;
        }
    }
    vec
}

/// Producto punto directo sobre vectores ya normalizados L2 (O(d) sin raíces cuadradas por documento)
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    a.iter().zip(b.iter()).map(|(&x, &y)| x * y).sum()
}
