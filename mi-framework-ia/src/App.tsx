import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SearchInput } from "./components/SearchInput";
import { ResultList, extractFileName, getResultUniqueKey } from "./components/ResultList";
import { VectorInspector } from "./components/VectorInspector";
import { FilePreviewModal } from "./components/FilePreviewModal";
import { TrayPopupView } from "./components/TrayPopupView";
import { WelcomeSetupModal } from "./components/WelcomeSetupModal";
import { SettingsModal } from "./components/SettingsModal";
import type { SearchResult, AppConfig } from "./types";
import "./index.css";

const QUICK_PROMPTS = [
  "TALLER DE STREAMNOW",
  "contrato penalización cláusula",
  "arquitectura microservicios",
  "resumen ejecutivo conclusiones",
];

type FileFilter = "all" | "pdf" | "text" | "code";

function App() {
  // Detectar si esta instancia de WebView corresponde al popup compacto de bandeja (360x500)
  const isTrayWindow = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("window") === "tray";
  }, []);

  if (isTrayWindow) {
    return <TrayPopupView />;
  }

  return <MainDesktopWindow />;
}

function MainDesktopWindow() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);
  const [showSetupCloseWarning, setShowSetupCloseWarning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [folderPath, setFolderPath] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLatencyMs, setSearchLatencyMs] = useState<number | null>(null);
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);

  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [ragSources, setRagSources] = useState<SearchResult[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const ragInputRef = useRef<HTMLInputElement>(null);

  const checkOllamaHealth = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const online = await invoke<boolean>("check_ollama_status");
      setIsOllamaOnline(online);
    } catch {
      setIsOllamaOnline(false);
    }
  }, []);

  const fetchIndexedCount = useCallback(async () => {
    try {
      const count = await invoke<number>("get_indexed_count");
      setIndexedCount(count);
    } catch (e) {
      console.error("Error fetching count:", e);
    }
  }, []);

  useEffect(() => {
    invoke<AppConfig>("get_app_config")
      .then((cfg) => {
        setAppConfig(cfg);
        if (cfg.indexed_folder) setFolderPath(cfg.indexed_folder);
      })
      .catch(console.error);

    invoke<string>("get_default_folder")
      .then((def) => setFolderPath((prev) => prev || def))
      .catch(() => setFolderPath("~/Documents/PruebaAI"));

    fetchIndexedCount();
    checkOllamaHealth();

    const interval = setInterval(checkOllamaHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchIndexedCount, checkOllamaHealth]);

  // Escuchar eventos globales emitidos desde la bandeja del sistema o desde Rust
  useEffect(() => {
    const unlistenCfg = listen<AppConfig>("config-updated", (event) => {
      setAppConfig(event.payload);
      if (event.payload.indexed_folder) {
        setFolderPath(event.payload.indexed_folder);
      }
    });
    const unlistenIdx = listen<number>("index-updated", (event) => {
      setIndexedCount(event.payload);
    });
    const unlistenNav = listen<string>("navigate-section", (event) => {
      if (event.payload === "settings") {
        setIsSettingsOpen(true);
      } else {
        setIsSettingsOpen(false);
      }
    });
    const unlistenSetupWarn = listen<boolean>("setup-required-warning", () => {
      setShowSetupCloseWarning(true);
    });

    return () => {
      unlistenCfg.then((f) => f());
      unlistenIdx.then((f) => f());
      unlistenNav.then((f) => f());
      unlistenSetupWarn.then((f) => f());
    };
  }, []);

  // Atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Eventos de Streaming RAG
  useEffect(() => {
    const unlistenSources = listen<SearchResult[]>("rag-sources", (event) => {
      setRagSources(event.payload || []);
    });
    const unlistenToken = listen<string>("rag-token", (event) => {
      setAnswer((prev) => prev + event.payload);
    });
    const unlistenDone = listen<boolean>("rag-done", () => {
      setIsAsking(false);
    });

    return () => {
      unlistenSources.then((fn) => fn());
      unlistenToken.then((fn) => fn());
      unlistenDone.then((fn) => fn());
    };
  }, []);

  const handleCompleteSetup = async (hideToTray: boolean) => {
    setIsCompletingSetup(true);
    try {
      const updated = await invoke<AppConfig>("complete_setup", { hideToTray });
      setAppConfig(updated);
      setShowSetupCloseWarning(false);
      setStatusMessage(
        "¡Configuración inicial completada! Ahora al pulsar la X la app permanecerá activa en la bandeja del sistema."
      );
    } catch (e) {
      console.error("Error completing setup:", e);
    } finally {
      setIsCompletingSetup(false);
    }
  };

  const handleResetSetup = async () => {
    try {
      const updated = await invoke<AppConfig>("reset_setup");
      setAppConfig(updated);
      setIsSettingsOpen(false);
    } catch (e) {
      console.error("Error resetting setup:", e);
    }
  };

  const handleToggleAutostart = async (enabled: boolean) => {
    try {
      const updated = await invoke<AppConfig>("set_autostart", { enabled });
      setAppConfig(updated);
      setStatusMessage(
        enabled
          ? "Inicio automático con el sistema activado."
          : "Inicio automático con el sistema desactivado."
      );
    } catch (e) {
      console.error("Error toggling autostart:", e);
    }
  };

  const executeSearch = useCallback(async (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setResults([]);
      setSelectedKey(null);
      setHasSearched(false);
      setSearchLatencyMs(null);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const t0 = performance.now();
    try {
      const searchResults: SearchResult[] = await invoke("search", {
        query: { text: trimmed, limit: 15 },
      });
      setSearchLatencyMs(Math.round((performance.now() - t0) * 10) / 10);
      setResults(searchResults);
      if (searchResults.length > 0) {
        setSelectedKey(getResultUniqueKey(searchResults[0], 0));
      } else {
        setSelectedKey(null);
      }
    } catch (error) {
      console.error("Error during search:", error);
      setStatusMessage("Error al ejecutar la búsqueda semántica.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedKey(null);
      setHasSearched(false);
      setSearchLatencyMs(null);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(query);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  const handleIndexFolder = async (targetPath?: string) => {
    const pathToScan = targetPath || folderPath;
    setIsIndexing(true);
    setStatusMessage(`Escaneando e indexando incrementalmente: ${pathToScan}...`);
    try {
      const count = pathToScan
        ? await invoke<number>("index_folder", { path: pathToScan })
        : await invoke<number>("index_downloads");
      setIndexedCount(count);
      setStatusMessage(
        `¡Índice actualizado! ${count} fragmentos vectoriales disponibles en caché local.`
      );
      if (query.trim()) {
        executeSearch(query);
      }
    } catch (error) {
      console.error("Error indexing folder:", error);
      setStatusMessage(
        typeof error === "string"
          ? error
          : "No se pudo escanear la carpeta seleccionada."
      );
    } finally {
      setIsIndexing(false);
    }
  };

  const handlePickFolder = async () => {
    try {
      const picked = await invoke<string | null>("pick_folder");
      if (picked) {
        setFolderPath(picked);
        await handleIndexFolder(picked);
      }
    } catch (error) {
      console.error("Error picking folder:", error);
      setStatusMessage("No se pudo abrir el selector nativo de carpetas.");
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isAsking) return;
    setIsAsking(true);
    setAnswer("");
    setRagSources([]);
    try {
      await invoke("ask_question_stream", { query: question });
    } catch (error) {
      console.error("Error asking question:", error);
      setAnswer(
        "No se pudo conectar con Ollama para streaming. Verifica que Ollama esté activo en tu equipo."
      );
      setIsAsking(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (fileFilter === "all") return results;
    return results.filter((r) => {
      const mime = r.file_item.mime_type.toLowerCase();
      if (fileFilter === "pdf") return mime.includes("pdf");
      if (fileFilter === "code") return mime.includes("source-code") || mime.includes("json");
      if (fileFilter === "text")
        return mime.includes("text/plain") || mime.includes("markdown") || mime.includes("csv");
      return true;
    });
  }, [results, fileFilter]);

  const selectedResult = useMemo(() => {
    if (!filteredResults.length) return null;
    if (selectedKey) {
      const found = filteredResults.find(
        (r, idx) => getResultUniqueKey(r, idx) === selectedKey
      );
      if (found) return found;
    }
    return filteredResults[0];
  }, [filteredResults, selectedKey]);

  const handleAskAboutDocument = (fileName: string) => {
    setQuestion(`¿Qué dice el documento "${fileName}" y cuáles son sus puntos clave?`);
    ragInputRef.current?.focus();
  };

  const renderAnswerWithCitations = (text: string) => {
    const parts = text.split(/(\[Doc\s+\d+\])/gi);
    return parts.map((part, idx) => {
      const match = part.match(/^\[Doc\s+(\d+)\]$/i);
      if (match) {
        const docIndex = parseInt(match[1], 10) - 1;
        const source = ragSources[docIndex];
        if (source) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setPreviewFilePath(source.file_item.path)}
              title={`Abrir vista previa de ${extractFileName(source.file_item.path)}`}
              className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#7DD3FC] font-mono text-xs hover:bg-[#38BDF8]/35 transition-colors cursor-pointer"
            >
              📄 {part}
            </button>
          );
        }
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] flex flex-col items-center py-6 px-4 sm:px-6 font-sans">
      <div className="w-full max-w-6xl flex flex-col gap-5">
        {/* Topbar estilo OmniSearch Desktop */}
        <header className="bg-[#0F172A] border border-[#94A3B8]/18 rounded-2xl px-5 py-3.5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-xl bg-[#38BDF8]/14 border border-[#38BDF8]/45 text-[#38BDF8] flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC]">
                  OmniSearch
                </h1>
                <span className="text-[11px] font-semibold text-[#38BDF8] bg-[#38BDF8]/14 border border-[#38BDF8]/35 px-2.5 py-0.5 rounded-full">
                  Desktop v0.4.2 · System Tray
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                <span className="font-mono truncate max-w-[260px]" title={folderPath}>
                  {folderPath || "~/Documents/PruebaAI"}
                </span>
                <span>•</span>
                <span className="text-[#CBD5E1] font-medium">
                  {indexedCount !== null
                    ? `${indexedCount} fragmentos en caché`
                    : "Cargando índice..."}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#CBD5E1]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOllamaOnline === true
                        ? "bg-[#34D399] animate-pulse"
                        : isOllamaOnline === false
                        ? "bg-amber-400"
                        : "bg-slate-500"
                    }`}
                  />
                  {isOllamaOnline === true
                    ? "Ollama Activo (Embeddings + RAG)"
                    : isOllamaOnline === false
                    ? "Modo Offline (Motor TF-IDF Local)"
                    : "Verificando motor IA..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#1E293B] hover:bg-[#263349] text-[#CBD5E1] border border-[#94A3B8]/25 transition-colors cursor-pointer"
            >
              ⚙️ Configuración
            </button>
            <button
              type="button"
              onClick={handlePickFolder}
              disabled={isIndexing}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#1E293B] hover:bg-[#263349] text-[#F8FAFC] border border-[#94A3B8]/25 transition-colors cursor-pointer disabled:opacity-50"
            >
              📁 Elegir Carpeta
            </button>
            <button
              type="button"
              onClick={() => handleIndexFolder()}
              disabled={isIndexing}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 border ${
                isIndexing
                  ? "bg-[#1E293B] text-[#94A3B8] border-[#94A3B8]/20 cursor-wait"
                  : "bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#06101F] border-transparent shadow-lg shadow-[#38BDF8]/20 cursor-pointer"
              }`}
            >
              {isIndexing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
                  Indexando...
                </>
              ) : (
                "Re-escanear"
              )}
            </button>
          </div>
        </header>

        {/* Notificación de estado accesible */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="text-xs text-[#38BDF8] bg-[#0F172A] border border-[#38BDF8]/35 px-4 py-2.5 rounded-xl flex items-center justify-between gap-2"
          >
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage("")}
              className="text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        )}

        {/* Ventana Principal de Búsqueda e Inspección Vectorial */}
        <section className="bg-[#0F172A] border border-[#94A3B8]/18 rounded-2xl overflow-hidden shadow-2xl">
          {isIndexing && (
            <div className="h-1 w-full bg-[#0B1120] overflow-hidden">
              <div className="h-full bg-[#38BDF8] animate-pulse w-2/3" />
            </div>
          )}

          {/* Área de Búsqueda + Chips rápidos + Filtros + Latencia */}
          <div className="p-5 border-b border-[#94A3B8]/18 space-y-3.5">
            <SearchInput
              value={query}
              onChange={setQuery}
              onSearch={() => executeSearch(query)}
              inputRef={searchInputRef}
              isSearching={isSearching}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Consultas rápidas:</span>
                {QUICK_PROMPTS.map((promptText) => {
                  const isActive = query.toLowerCase() === promptText.toLowerCase();
                  return (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => setQuery(promptText)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] font-medium"
                          : "bg-[#1E293B] border-[#94A3B8]/18 text-[#CBD5E1] hover:border-[#38BDF8]/60 hover:text-[#38BDF8]"
                      }`}
                    >
                      {promptText}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                {searchLatencyMs !== null && hasSearched && (
                  <span className="font-mono text-[11px] text-[#34D399]">
                    ⚡ {filteredResults.length} resultados en {searchLatencyMs} ms
                  </span>
                )}

                <div className="flex items-center gap-1 bg-[#0B1120] p-1 rounded-full border border-[#94A3B8]/18">
                  {(
                    [
                      { id: "all", label: "Todos" },
                      { id: "pdf", label: "PDF" },
                      { id: "text", label: "Texto/MD" },
                      { id: "code", label: "Código/JSON" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFileFilter(tab.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                        fileFilter === tab.id
                          ? "bg-[#38BDF8] text-[#06101F] font-semibold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de 2 Columnas: Resultados + Inspector Vectorial Lateral */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-[#94A3B8]/18 min-h-[340px]">
            <ResultList
              results={filteredResults}
              selectedId={
                selectedResult
                  ? getResultUniqueKey(
                      selectedResult,
                      filteredResults.indexOf(selectedResult)
                    )
                  : null
              }
              onSelect={(_res, key) => setSelectedKey(key)}
              hasSearched={hasSearched}
              query={query}
            />

            <VectorInspector
              selectedResult={selectedResult}
              query={query}
              onAskAboutDocument={handleAskAboutDocument}
              onOpenPreview={(path) => setPreviewFilePath(path)}
            />
          </div>
        </section>

        {/* Panel Asistente RAG Contextual con Streaming + Citas Clickeables */}
        <section className="bg-[#0F172A] border border-[#94A3B8]/18 p-5 rounded-2xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#38BDF8] font-semibold">
                Asistente Contextual Local (RAG Streaming)
              </span>
              <h2 className="text-sm font-bold text-[#F8FAFC]">
                Pregunta directamente sobre tus documentos con citas verificables
              </h2>
            </div>
            <span className="text-xs text-[#94A3B8]">
              Contexto inyectado: Top 4 fragmentos relevantes
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              ref={ragInputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej. ¿De qué trata el TALLER DE STREAMNOW y cuáles son sus requisitos?"
              aria-label="Pregunta en lenguaje natural para el asistente RAG"
              className="flex-1 bg-[#0B1120] border border-[#94A3B8]/25 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#38BDF8] transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAskQuestion();
              }}
            />
            <button
              type="button"
              onClick={handleAskQuestion}
              disabled={isAsking || !question.trim()}
              className="px-5 py-2.5 bg-[#38BDF8] hover:bg-[#7DD3FC] disabled:bg-[#1E293B] disabled:text-[#94A3B8] text-[#06101F] rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isAsking ? "Generando en vivo..." : "Preguntar a IA"}
            </button>
          </div>

          {(answer || isAsking) && (
            <div
              role="region"
              aria-live="polite"
              aria-label="Respuesta generada por IA"
              className="mt-1 p-4 bg-[#0B1120] border border-[#38BDF8]/30 rounded-xl text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap"
            >
              {answer ? renderAnswerWithCitations(answer) : "Buscando contexto y conectando con Llama 3.2..."}
              {isAsking && (
                <span className="inline-block w-2 h-4 ml-1 align-middle bg-[#38BDF8] animate-pulse" />
              )}

              {ragSources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#94A3B8]/18 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-[#94A3B8]">Fuentes citadas:</span>
                  {ragSources.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewFilePath(src.file_item.path)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#1E293B] hover:bg-[#263349] border border-[#38BDF8]/30 text-[#7DD3FC] transition-colors cursor-pointer"
                    >
                      [Doc {idx + 1}] {extractFileName(src.file_item.path)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modal de Primera Ejecución (Onboarding / Setup Inicial) */}
      <WelcomeSetupModal
        isOpen={appConfig !== null && !appConfig.setup_completed}
        showCloseWarning={showSetupCloseWarning}
        isSubmitting={isCompletingSetup}
        onCompleteSetup={handleCompleteSetup}
      />

      {/* Modal de Configuración (Autostart, Carpeta y Reinicio de Setup) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        config={appConfig}
        onClose={() => setIsSettingsOpen(false)}
        onToggleAutostart={handleToggleAutostart}
        onResetSetup={handleResetSetup}
        onPickFolder={handlePickFolder}
      />

      {/* Modal Previsualizador de PDF y Texto */}
      <FilePreviewModal
        filePath={previewFilePath}
        query={query}
        onClose={() => setPreviewFilePath(null)}
      />
    </div>
  );
}

export default App;
