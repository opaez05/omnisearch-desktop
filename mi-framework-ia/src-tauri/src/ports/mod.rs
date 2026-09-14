use crate::domain::entities::{FileItem, SearchResult};
use crate::domain::error::Result;

pub trait VectorStorePort: Send + Sync {
    fn upsert(&self, id: &str, embedding: Vec<f32>, metadata: &FileItem) -> Result<()>;
    fn search_cosine(&self, query_embedding: Vec<f32>, limit: usize) -> Result<Vec<SearchResult>>;
}

pub trait ContentExtractorPort: Send + Sync {
    fn can_handle(&self, mime_type: &str) -> bool;
    fn extract(&self, file_path: &str) -> Result<String>;
}

#[allow(async_fn_in_trait)]
pub trait AiInferencePort: Send + Sync {
    async fn generate_embeddings(&self, text: &str) -> Result<Vec<f32>>;
    async fn generate_description(&self, text: &str) -> Result<String>;
    async fn generate_text(&self, prompt: &str) -> Result<String>;
}
