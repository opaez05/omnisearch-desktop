use crate::ports::AiInferencePort;
use crate::domain::error::{Result, FrameworkError};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

#[derive(Serialize)]
struct EmbeddingRequest<'a> {
    model: &'a str,
    prompt: &'a str,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: Option<Vec<f32>>,
}

#[derive(Serialize)]
struct BatchEmbedRequest<'a> {
    model: &'a str,
    input: &'a [String],
}

#[derive(Deserialize)]
struct BatchEmbedResponse {
    embeddings: Option<Vec<Vec<f32>>>,
}

#[derive(Serialize)]
struct OllamaOptions {
    num_ctx: u32,
}

#[derive(Serialize)]
struct GenerateRequest<'a> {
    model: &'a str,
    prompt: &'a str,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: Option<String>,
    done: Option<bool>,
}

pub struct OllamaAdapter {
    base_url: String,
    fallback_url: Option<String>,
    embedding_model: String,
    completion_model: String,
    client: Client,
    health_client: Client,
    online_cache: Arc<AtomicBool>,
}

impl OllamaAdapter {
    pub fn new(base_url: &str, embedding_model: &str, completion_model: &str) -> Self {
        let client = Client::builder()
            .connect_timeout(Duration::from_millis(1500))
            .timeout(Duration::from_secs(90))
            .pool_max_idle_per_host(4)
            .build()
            .unwrap_or_default();

        let health_client = Client::builder()
            .connect_timeout(Duration::from_millis(1000))
            .timeout(Duration::from_millis(1800))
            .build()
            .unwrap_or_default();

        let resolved_base = std::env::var("OLLAMA_HOST")
            .ok()
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| base_url.to_string());

        let resolved_fallback = std::env::var("OLLAMA_FALLBACK_HOST")
            .ok()
            .map(|v| v.trim().trim_end_matches('/').to_string())
            .or_else(|| Some("http://26.120.235.111:11434".to_string()))
            .filter(|v| !v.is_empty());

        Self {
            base_url: resolved_base.trim().trim_end_matches('/').to_string(),
            fallback_url: resolved_fallback,
            embedding_model: embedding_model.to_string(),
            completion_model: completion_model.to_string(),
            client,
            health_client,
            online_cache: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn default_remote() -> Self {
        Self::new("http://127.0.0.1:11434", "nomic-embed-text", "llama3.2:3b")
    }

    pub fn is_cached_online(&self) -> bool {
        self.online_cache.load(Ordering::Relaxed)
    }

    fn candidate_urls(&self, endpoint_path: &str) -> Vec<String> {
        let path = endpoint_path.trim_start_matches('/');
        let mut urls = vec![format!("{}/{}", self.base_url, path)];
        if let Some(ref fb) = self.fallback_url {
            if fb != &self.base_url {
                urls.push(format!("{}/{}", fb, path));
            }
        }
        urls
    }

    pub async fn check_health(&self) -> bool {
        for url in self.candidate_urls("api/tags") {
            if self
                .health_client
                .get(&url)
                .send()
                .await
                .map(|res| res.status().is_success())
                .unwrap_or(false)
            {
                self.online_cache.store(true, Ordering::Relaxed);
                return true;
            }
        }
        self.online_cache.store(false, Ordering::Relaxed);
        false
    }

    /// Genera texto en streaming (NDJSON) invocando un callback por cada token recibido
    pub async fn generate_text_stream<F>(&self, prompt: &str, mut on_token: F) -> Result<String>
    where
        F: FnMut(&str),
    {
        let body = GenerateRequest {
            model: &self.completion_model,
            prompt,
            stream: true,
            options: OllamaOptions { num_ctx: 2048 },
        };

        for url in self.candidate_urls("api/generate") {
            if let Ok(mut response) = self.client.post(&url).json(&body).send().await {
                if response.status().is_success() {
                    self.online_cache.store(true, Ordering::Relaxed);
                    let mut full_text = String::new();
                    let mut buffer = String::new();

                    while let Ok(Some(chunk)) = response.chunk().await {
                        let text_chunk = String::from_utf8_lossy(&chunk);
                        buffer.push_str(&text_chunk);

                        while let Some(newline_pos) = buffer.find('\n') {
                            let line = buffer[..newline_pos].trim().to_string();
                            buffer = buffer[newline_pos + 1..].to_string();
                            if line.is_empty() {
                                continue;
                            }
                            if let Ok(parsed) = serde_json::from_str::<GenerateResponse>(&line) {
                                if let Some(tok) = parsed.response {
                                    if !tok.is_empty() {
                                        full_text.push_str(&tok);
                                        on_token(&tok);
                                    }
                                }
                                if parsed.done == Some(true) {
                                    return Ok(full_text);
                                }
                            }
                        }
                    }

                    if !buffer.trim().is_empty() {
                        if let Ok(parsed) = serde_json::from_str::<GenerateResponse>(buffer.trim()) {
                            if let Some(tok) = parsed.response {
                                full_text.push_str(&tok);
                                on_token(&tok);
                            }
                        }
                    }

                    return Ok(full_text);
                }
            }
        }

        self.online_cache.store(false, Ordering::Relaxed);
        Err(FrameworkError::AiInferenceError(
            "Failed to connect to Ollama for streaming".to_string(),
        ))
    }
}

impl AiInferencePort for OllamaAdapter {
    async fn generate_embeddings(&self, text: &str) -> Result<Vec<f32>> {
        let body = EmbeddingRequest {
            model: &self.embedding_model,
            prompt: text,
        };

        let mut last_err = String::new();
        for url in self.candidate_urls("api/embeddings") {
            if let Ok(response) = self.client.post(&url).json(&body).send().await {
                if response.status().is_success() {
                    if let Ok(res_payload) = response.json::<EmbeddingResponse>().await {
                        if let Some(vec) = res_payload.embedding {
                            self.online_cache.store(true, Ordering::Relaxed);
                            return Ok(vec);
                        }
                    }
                } else {
                    last_err = response.text().await.unwrap_or_default();
                }
            }
        }

        self.online_cache.store(false, Ordering::Relaxed);
        Err(FrameworkError::AiInferenceError(format!(
            "Failed to connect to Ollama: {}",
            last_err
        )))
    }

    async fn generate_embeddings_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let batch_body = BatchEmbedRequest {
            model: &self.embedding_model,
            input: texts,
        };

        for url in self.candidate_urls("api/embed") {
            if let Ok(response) = self.client.post(&url).json(&batch_body).send().await {
                if response.status().is_success() {
                    if let Ok(res_payload) = response.json::<BatchEmbedResponse>().await {
                        if let Some(vecs) = res_payload.embeddings {
                            if vecs.len() == texts.len() {
                                self.online_cache.store(true, Ordering::Relaxed);
                                return Ok(vecs);
                            }
                        }
                    }
                }
            }
        }

        let mut results = Vec::with_capacity(texts.len());
        for text in texts {
            results.push(self.generate_embeddings(text).await?);
        }
        Ok(results)
    }

    async fn generate_description(&self, text: &str) -> Result<String> {
        self.generate_text(&format!(
            "Genera una síntesis breve en español del siguiente contenido:\n\n{}",
            text
        ))
        .await
    }

    async fn generate_text(&self, prompt: &str) -> Result<String> {
        let body = GenerateRequest {
            model: &self.completion_model,
            prompt,
            stream: false,
            options: OllamaOptions { num_ctx: 2048 },
        };

        for url in self.candidate_urls("api/generate") {
            if let Ok(response) = self.client.post(&url).json(&body).send().await {
                if response.status().is_success() {
                    if let Ok(res_payload) = response.json::<GenerateResponse>().await {
                        if let Some(resp_text) = res_payload.response {
                            self.online_cache.store(true, Ordering::Relaxed);
                            return Ok(resp_text);
                        }
                    }
                }
            }
        }

        self.online_cache.store(false, Ordering::Relaxed);
        Err(FrameworkError::AiInferenceError(
            "Failed to connect to Ollama".to_string(),
        ))
    }
}
