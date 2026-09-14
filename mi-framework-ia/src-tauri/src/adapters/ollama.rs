use crate::ports::AiInferencePort;
use crate::domain::error::{Result, FrameworkError};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize)]
struct EmbeddingRequest {
    model: String,
    prompt: String,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: Option<Vec<f32>>,
}

#[derive(Serialize)]
struct OllamaOptions {
    num_ctx: u32,
}

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: Option<String>,
}

pub struct OllamaAdapter {
    base_url: String,
    embedding_model: String,
    completion_model: String,
    client: Client,
}

impl OllamaAdapter {
    pub fn new(base_url: &str, embedding_model: &str, completion_model: &str) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap_or_default();

        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            embedding_model: embedding_model.to_string(),
            completion_model: completion_model.to_string(),
            client,
        }
    }

    pub fn default_remote() -> Self {
        Self::new("http://127.0.0.1:11434", "nomic-embed-text", "llama3.2:3b")
    }

    pub async fn check_health(&self) -> bool {
        let url_local = "http://127.0.0.1:11434/api/tags";
        if self.client.get(url_local).send().await.map(|res| res.status().is_success()).unwrap_or(false) {
            return true;
        }
        let url_remote = "http://26.120.235.111:11434/api/tags";
        self.client.get(url_remote).send().await.map(|res| res.status().is_success()).unwrap_or(false)
    }
}

impl AiInferencePort for OllamaAdapter {
    async fn generate_embeddings(&self, text: &str) -> Result<Vec<f32>> {
        let body = EmbeddingRequest {
            model: self.embedding_model.clone(),
            prompt: text.to_string(),
        };

        // Try local first, then remote IP
        let urls = vec![
            "http://127.0.0.1:11434/api/embeddings".to_string(),
            "http://26.120.235.111:11434/api/embeddings".to_string(),
        ];

        let mut last_err = String::new();
        for url in urls {
            if let Ok(response) = self.client.post(&url).json(&body).send().await {
                if response.status().is_success() {
                    if let Ok(res_payload) = response.json::<EmbeddingResponse>().await {
                        if let Some(vec) = res_payload.embedding {
                            return Ok(vec);
                        }
                    }
                } else {
                    last_err = response.text().await.unwrap_or_default();
                }
            }
        }

        Err(FrameworkError::AiInferenceError(format!("Failed to connect to Ollama: {}", last_err)))
    }

    async fn generate_description(&self, text: &str) -> Result<String> {
        self.generate_text(&format!("Genera una síntesis breve en español del siguiente contenido:\n\n{}", text)).await
    }

    async fn generate_text(&self, prompt: &str) -> Result<String> {
        let body = GenerateRequest {
            model: self.completion_model.clone(),
            prompt: prompt.to_string(),
            stream: false,
            options: OllamaOptions {
                num_ctx: 2048,
            },
        };

        let urls = vec![
            "http://127.0.0.1:11434/api/generate".to_string(),
            "http://26.120.235.111:11434/api/generate".to_string(),
        ];

        for url in urls {
            if let Ok(response) = self.client.post(&url).json(&body).send().await {
                if response.status().is_success() {
                    if let Ok(res_payload) = response.json::<GenerateResponse>().await {
                        if let Some(resp_text) = res_payload.response {
                            return Ok(resp_text);
                        }
                    }
                }
            }
        }

        Err(FrameworkError::AiInferenceError("Failed to connect to Ollama".to_string()))
    }
}
