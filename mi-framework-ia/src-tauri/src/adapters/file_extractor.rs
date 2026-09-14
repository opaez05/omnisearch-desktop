use crate::ports::ContentExtractorPort;
use crate::domain::error::{Result, FrameworkError};
use std::fs;
use std::path::Path;

pub struct TextFileExtractor;

impl TextFileExtractor {
    pub fn new() -> Self {
        Self
    }
}

impl ContentExtractorPort for TextFileExtractor {
    fn can_handle(&self, mime_type: &str) -> bool {
        mime_type.starts_with("text/") 
            || mime_type.contains("json") 
            || mime_type.contains("javascript")
            || mime_type.contains("typescript")
            || mime_type.contains("xml")
            || mime_type == "application/x-subrip"
            || mime_type == "application/pdf"
    }

    fn extract(&self, file_path: &str) -> Result<String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(FrameworkError::ExtractionError(format!("File does not exist: {}", file_path)));
        }

        let is_pdf = file_path.to_lowercase().ends_with(".pdf");

        if is_pdf {
            let content = pdf_extract::extract_text(path).map_err(|e| FrameworkError::ExtractionError(e.to_string()))?;
            // Clean up spaced-out letters like "F A C T U R A" -> "FACTURA"
            let cleaned = content.lines()
                .map(|line| {
                    // Normalize multiple spaces
                    line.split_whitespace().collect::<Vec<_>>().join(" ")
                })
                .collect::<Vec<_>>()
                .join("\n");
            Ok(cleaned)
        } else {
            // Read text file content safely, replacing invalid UTF-8 sequences
            let bytes = fs::read(path).map_err(|e| FrameworkError::ExtractionError(e.to_string()))?;
            let content = String::from_utf8_lossy(&bytes).to_string();

            // We no longer truncate to 10,000 characters because we will chunk the content
            Ok(content)
        }
    }
}
