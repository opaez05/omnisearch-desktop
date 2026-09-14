use crate::adapters::file_extractor::TextFileExtractor;
use crate::adapters::in_memory_store::InMemoryVectorStore;
use crate::adapters::ollama::OllamaAdapter;
use crate::ports::{ContentExtractorPort, AiInferencePort, VectorStorePort};
use crate::domain::entities::{FileItem, SearchResult};
use crate::domain::error::{Result, FrameworkError};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::SystemTime;

#[derive(Clone)]
pub struct SemanticExplorerApp {
    pub store: InMemoryVectorStore,
    extractor: Arc<TextFileExtractor>,
    ai_client: Arc<OllamaAdapter>,
}

impl SemanticExplorerApp {
    pub fn new() -> Self {
        Self {
            store: InMemoryVectorStore::new(),
            extractor: Arc::new(TextFileExtractor::new()),
            ai_client: Arc::new(OllamaAdapter::default_remote()),
        }
    }

    pub async fn check_ollama_health(&self) -> bool {
        self.ai_client.check_health().await
    }

    pub async fn index_downloads_folder(&self) -> Result<usize> {
        let docs_dir = dirs::document_dir()
            .map(|p| p.join("PruebaAI"))
            .ok_or_else(|| FrameworkError::IndexingError("Could not locate Documents directory".to_string()))?;

        self.index_directory(&docs_dir).await
    }

    pub async fn index_directory(&self, dir_path: &Path) -> Result<usize> {
        if !dir_path.exists() || !dir_path.is_dir() {
            return Err(FrameworkError::IndexingError(format!(
                "Directory does not exist or is not a folder: {:?}",
                dir_path
            )));
        }

        self.store.clear()?;

        let mut indexed_count = 0;
        let entries = fs::read_dir(dir_path)
            .map_err(|e| FrameworkError::IndexingError(e.to_string()))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Err(err) = self.index_single_file(&path).await {
                    log::warn!("Failed to index file {:?}: {}", path, err);
                } else {
                    indexed_count += 1;
                }
            }
        }

        Ok(indexed_count)
    }

    async fn index_single_file(&self, path: &Path) -> Result<()> {
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        let mime_type = match extension.as_str() {
            "txt" | "log" => "text/plain",
            "md" | "markdown" => "text/markdown",
            "json" => "application/json",
            "csv" => "text/csv",
            "html" | "htm" => "text/html",
            "js" | "jsx" | "ts" | "tsx" | "py" | "rs" | "css" => "text/x-source-code",
            _ => "application/octet-stream",
        };

        if !self.extractor.can_handle(mime_type) && extension != "pdf" {
            return Ok(());
        }

        let content = self.extractor.extract(path.to_str().unwrap_or_default())?;
        if content.trim().is_empty() {
            return Ok(());
        }

        let metadata = fs::metadata(path).map_err(|e| FrameworkError::IndexingError(e.to_string()))?;
        let file_size = metadata.len();
        let indexed_at = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let sha256_hash = format!("{:x}", hasher.finalize());

        let file_path_str = path.to_string_lossy().to_string();
        let file_id = sha256_hash.chars().take(16).collect::<String>();

        let file_item = FileItem {
            id: file_id.clone(),
            path: file_path_str.clone(),
            sha256_hash,
            mime_type: mime_type.to_string(),
            file_size,
            indexed_at,
        };

        // Chunking the content to avoid exceeding context window (e.g. 500 characters)
        let chunk_size = 500;
        let overlap = 100;
        let chars: Vec<char> = content.chars().collect();
        let mut i = 0;
        let mut chunk_index = 0;

        while i < chars.len() {
            let end = std::cmp::min(i + chunk_size, chars.len());
            let chunk_content: String = chars[i..end].iter().collect();

            if chunk_content.trim().is_empty() {
                i += chunk_size - overlap;
                continue;
            }

            let chunk_id = format!("{}_{}", file_id, chunk_index);

            // Generate embeddings asynchronously from Ollama at 26.120.235.111
            let embedding = match self.ai_client.generate_embeddings(&chunk_content).await {
                Ok(vec) => vec,
                Err(e) => {
                    log::warn!("Ollama embedding failed for {:?} chunk {}, fallback to zero vector: {}", path, chunk_index, e);
                    vec![0.0; 384]
                }
            };

            self.store.upsert_with_snippet(&chunk_id, embedding, &file_item, chunk_content)?;

            chunk_index += 1;
            i += chunk_size - overlap;
            if chunk_size >= chars.len() {
                break;
            }
        }
        
        log::info!("Indexed {} chunks for {:?}", chunk_index, path);
        Ok(())
    }

    pub async fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        // Try generating query vector via Ollama asynchronously
        if let Ok(query_vec) = self.ai_client.generate_embeddings(query).await {
            if let Ok(cosine_results) = self.store.search_cosine(query_vec, limit) {
                if !cosine_results.is_empty() {
                    return cosine_results;
                }
            }
        }

        // Fallback to keyword search if Ollama is unreachable or model not ready
        self.store.search_keyword(query, limit)
    }

    pub fn get_total_indexed(&self) -> usize {
        self.store.len()
    }

    pub async fn ask_question(&self, query: &str) -> Result<String> {
        let results = self.search(query, 3).await;
        
        let mut context = String::new();
        for (i, res) in results.iter().enumerate() {
            context.push_str(&format!("Documento: {}\nFragmento {}:\n{}\n\n", res.file_item.path, i + 1, res.relevant_snippet));
        }
        
        if context.is_empty() {
            return Ok("No encontré información relevante en tus documentos descargados para responder a esta pregunta.".to_string());
        }

        let prompt = format!(
            "Eres un asistente de Inteligencia Artificial servicial. Responde a la pregunta del usuario en español y de forma natural usando el contenido de estos documentos.\n\nDocumentos:\n{}\n\nPregunta: {}\n\nRespuesta completa y clara:",
            context, query
        );

        self.ai_client.generate_text(&prompt).await
    }
}
