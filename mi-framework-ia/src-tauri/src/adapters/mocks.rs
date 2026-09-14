use crate::ports::AiInferencePort;
use crate::domain::error::Result;

pub struct MockAiInference;

impl MockAiInference {
    pub fn new() -> Self {
        Self
    }
}

impl AiInferencePort for MockAiInference {
    async fn generate_embeddings(&self, _text: &str) -> Result<Vec<f32>> {
        Ok(vec![0.1; 384])
    }

    async fn generate_description(&self, _text: &str) -> Result<String> {
        Ok("Mocked description for the provided text.".to_string())
    }

    async fn generate_text(&self, _prompt: &str) -> Result<String> {
        Ok("Mocked response for the provided prompt.".to_string())
    }
}
