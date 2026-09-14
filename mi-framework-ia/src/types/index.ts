export interface FileItem {
  id: string;
  path: string;
  sha256_hash: string;
  mime_type: string;
  file_size: number;
  indexed_at: number;
}

export interface SearchQuery {
  text: string;
  limit: number;
}

export interface SearchResult {
  file_item: FileItem;
  score: number;
  relevant_snippet: string;
  metadata: Record<string, string>;
}
