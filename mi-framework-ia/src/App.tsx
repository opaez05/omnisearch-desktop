import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SearchInput } from "./components/SearchInput";
import { ResultList } from "./components/ResultList";
import type { SearchResult } from "./types";
import "./index.css";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Comprobar estado de conexión con Ollama en 26.120.235.111
  const checkOllamaHealth = async () => {
    try {
      const online = await invoke<boolean>("check_ollama_status");
      setIsOllamaOnline(online);
    } catch {
      setIsOllamaOnline(false);
    }
  };

  const fetchIndexedCount = async () => {
    try {
      const count = await invoke<number>("get_indexed_count");
      setIndexedCount(count);
    } catch (e) {
      console.error("Error fetching count:", e);
    }
  };

  useEffect(() => {
    fetchIndexedCount();
    checkOllamaHealth();

    // Verificación periódica cada 15 segundos
    const interval = setInterval(checkOllamaHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleIndexDownloads = async () => {
    setIsIndexing(true);
    setStatusMessage("Escaneando e indexando carpeta Documents/PruebaAI...");
    try {
      const count = await invoke<number>("index_downloads");
      setIndexedCount(count);
      setStatusMessage(`¡Éxito! Se indexaron ${count} chunks de archivos de Documents/PruebaAI.`);
    } catch (error) {
      console.error("Error indexing downloads:", error);
      setStatusMessage("Error al escanear la carpeta Documents/PruebaAI.");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    try {
      const searchResults: SearchResult[] = await invoke("search", {
        query: { text: query, limit: 10 }
      });
      setResults(searchResults);
    } catch (error) {
      console.error("Error during search:", error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    setAnswer("Consultando a Ollama y tus documentos...");
    try {
      const response = await invoke<string>("ask_question", { query: question });
      setAnswer(response);
    } catch (error) {
      console.error("Error asking question:", error);
      setAnswer("Ocurrió un error al preguntar a Ollama.");
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    if (query.trim() === "") {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center pt-16 px-4 font-sans pb-16">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* Header & Controls */}
        <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Semantic Search Explorer
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-gray-400">
                {indexedCount !== null
                  ? `${indexedCount} chunks indexados`
                  : "Sin archivos"}
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOllamaOnline === true
                      ? "bg-emerald-400 animate-pulse"
                      : isOllamaOnline === false
                      ? "bg-amber-500"
                      : "bg-gray-500"
                  }`}
                ></span>
                {isOllamaOnline === true
                  ? "Ollama (26.120.235.111) Online"
                  : isOllamaOnline === false
                  ? "Ollama Offline (Uso local TF-IDF)"
                  : "Verificando Ollama..."}
              </span>
            </div>
          </div>
          <button
            onClick={handleIndexDownloads}
            disabled={isIndexing}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md ${
              isIndexing
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
            }`}
          >
            {isIndexing ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                Indexando...
              </>
            ) : (
              "Escanear Descargas"
            )}
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className="text-xs text-blue-300 bg-blue-950/60 border border-blue-800/50 px-4 py-2 rounded-lg text-center animate-fade-in">
            {statusMessage}
          </div>
        )}

        {/* Chat / RAG Section */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg mt-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-300">Pregunta a tus documentos (RAG)</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿De qué trata el TALLER DE STREAMNOW?"
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskQuestion();
              }}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isAsking || !question.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              Preguntar
            </button>
          </div>
          {answer && (
            <div className="mt-2 p-3 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
              {answer}
            </div>
          )}
        </div>

        <div className="my-2 border-b border-gray-800 w-full" />

        {/* Search Input & Results */}
        <h2 className="text-sm font-semibold text-gray-300">Búsqueda Semántica Tradicional</h2>
        <SearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
        />
        <ResultList results={results} />
      </div>
    </div>
  );
}

export default App;
