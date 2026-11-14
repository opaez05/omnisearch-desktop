import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { SearchResult, AppConfig } from '../types';
import { extractFileName } from './ResultList';
import { HighlightText } from './HighlightText';

export const TrayPopupView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [indexedCount, setIndexedCount] = useState<number>(0);
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const [cnt, online, cfg] = await Promise.all([
        invoke<number>('get_indexed_count'),
        invoke<boolean>('check_ollama_status'),
        invoke<AppConfig>('get_app_config'),
      ]);
      setIndexedCount(cnt);
      setIsOllamaOnline(online);
      setConfig(cfg);
    } catch (e) {
      console.error('Error refreshing tray state:', e);
    }
  }, []);

  useEffect(() => {
    refreshState();
    const unlistenCfg = listen<AppConfig>('config-updated', (ev) => setConfig(ev.payload));
    const unlistenIdx = listen<number>('index-updated', (ev) => setIndexedCount(ev.payload));
    return () => {
      unlistenCfg.then((f) => f());
      unlistenIdx.then((f) => f());
    };
  }, [refreshState]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await invoke<SearchResult[]>('search', {
          query: { text: trimmed, limit: 6 },
        });
        setResults(res);
      } catch (e) {
        console.error(e);
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  const handleQuickRescan = async () => {
    if (isIndexing) return;
    setIsIndexing(true);
    try {
      const folder = config?.indexed_folder;
      const cnt = folder
        ? await invoke<number>('index_folder', { path: folder })
        : await invoke<number>('index_downloads');
      setIndexedCount(cnt);
    } catch (e) {
      console.error(e);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await invoke('open_file_in_os', { path: filePath });
      await invoke('hide_tray_popup');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExpandMain = async (section?: string) => {
    await invoke('show_full_app', { section: section || 'search' });
  };

  return (
    <div className="w-screen h-screen bg-[#0B1120] text-[#F8FAFC] border border-[#38BDF8]/40 rounded-xl overflow-hidden flex flex-col select-none shadow-2xl">
      {/* Cabecera compacta del Tray Popup */}
      <header className="px-3.5 py-2.5 bg-[#080D19] border-b border-[#94A3B8]/18 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] flex items-center justify-center text-xs font-bold">
            ⚡
          </span>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-[#F8FAFC] leading-none">
              OmniSearch Tray
            </h1>
            <span className="text-[10px] text-[#94A3B8]">
              {indexedCount} chunks · {isOllamaOnline ? 'Ollama Online' : 'TF-IDF Local'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleQuickRescan}
            disabled={isIndexing}
            title="Re-escanear carpeta"
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263349] text-xs text-[#CBD5E1] cursor-pointer disabled:opacity-50"
          >
            {isIndexing ? '⏳' : '🔄'}
          </button>
          <button
            type="button"
            onClick={() => handleExpandMain('settings')}
            title="Abrir Configuración"
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263349] text-xs text-[#CBD5E1] cursor-pointer"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Buscador instantáneo */}
      <div className="p-3 border-b border-[#94A3B8]/18 bg-[#0F172A]">
        <div className="flex items-center bg-[#0B1120] border border-[#38BDF8]/45 rounded-lg px-2.5 py-2">
          <svg
            className="w-4 h-4 text-[#38BDF8] mr-2 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth={2.2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Búsqueda rápida desde bandeja..."
            className="w-full bg-transparent text-xs text-[#F8FAFC] placeholder-[#94A3B8] outline-none"
          />
        </div>
      </div>

      {/* Lista compacta de resultados */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 text-[#94A3B8]">
            <p className="text-xs font-medium text-[#CBD5E1] mb-1">
              {query.trim()
                ? 'Sin coincidencias para tu consulta'
                : 'Busca documentos al instante'}
            </p>
            <p className="text-[11px] leading-relaxed">
              Haz clic en cualquier resultado para abrirlo directamente o expande la app completa.
            </p>
          </div>
        ) : (
          results.map((r, idx) => {
            const name = extractFileName(r.file_item.path);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenFile(r.file_item.path)}
                className="w-full text-left p-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#94A3B8]/18 hover:border-[#38BDF8]/50 transition-all cursor-pointer block"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                    {name}
                  </span>
                  <span className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/12 px-1.5 py-0.5 rounded shrink-0">
                    {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-[#CBD5E1] line-clamp-2 leading-snug">
                  <HighlightText text={r.relevant_snippet} query={query} />
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Pie del Popup con botón para abrir la ventana completa */}
      <footer className="p-2.5 bg-[#080D19] border-t border-[#94A3B8]/18 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleExpandMain('search')}
          className="w-full py-1.5 px-3 rounded-lg bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#06101F] font-bold text-xs transition-colors cursor-pointer"
        >
          Abrir OmniSearch Completo ↗
        </button>
      </footer>
    </div>
  );
};
