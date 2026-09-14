use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Vector store error: {0}")]
    VectorStoreError(String),
    #[error("Content extraction error: {0}")]
    ExtractionError(String),
    #[error("AI Inference error: {0}")]
    AiInferenceError(String),
    #[error("Indexing error: {0}")]
    IndexingError(String),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, AppError>;
pub type FrameworkError = AppError;
