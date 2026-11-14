import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SearchResult } from '../types';
import { extractFileName } from './ResultList';
import { HighlightText } from './HighlightText';

interface VectorInspectorProps {
  selectedResult: SearchResult | null;
  query: string;
  onAskAboutDocument: (fileName: string) => void;
  onOpenPreview: (filePath: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const VectorInspector: React.FC<VectorInspectorProps> = ({
  selectedResult,
  query,
  onAskAboutDocument,
  onOpenPreview,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);

  if (!selectedResult) {
    return (
      <aside
        className="p-5 bg-[#0B1120]/60 flex flex-col justify-center items-center text-center min-h-[260px]"
        aria-label="Inspector de metadatos vectoriales"
      >
        <span className="font-mono text-xs uppercase tracking-wider text-[#38BDF8] mb-2">
          Inspector Vectorial Local
        </span>
        <p className="text-xs text-[#94A3B8] max-w-xs">
          Selecciona cualquier archivo en la columna izquierda para inspeccionar su vector semántico, previsualizar el PDF/texto o consultar al asistente RAG.
        </p>
      </aside>
    );
  }

  const { file_item, score, relevant_snippet, metadata } = selectedResult;
  const fileName = extractFileName(file_item.path);
  const engine = metadata?.engine || 'Embeddings Locales';
  const chunkBadge = metadata?.chunk_index
    ? `Fragmento #${metadata.chunk_index} de ${metadata.total_chunks || '?'}`
    : 'Fragmento indexado';

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(file_item.path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1800);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  const handleOpenInOS = async () => {
    try {
      await invoke('open_file_in_os', { path: file_item.path });
    } catch (e) {
      console.error('Error opening file:', e);
    }
  };

  return (
    <aside
      className="p-5 bg-[#0B1120]/60 flex flex-col justify-between gap-4"
      aria-live="polite"
      aria-label="Inspector de metadatos vectoriales"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#38BDF8] font-semibold">
            Inspector Vectorial Local
          </span>
          <span className="font-mono text-[11px] text-[#34D399] bg-[#34D399]/12 px-2 py-0.5 rounded-full">
            {chunkBadge}
          </span>
        </div>

        <h4 className="text-base font-bold text-[#F8FAFC] break-words mb-3">
          {fileName}
        </h4>

        <ul className="text-xs text-[#CBD5E1] space-y-2 mb-4">
          <li className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <strong className="text-[#94A3B8]">Ruta local:</strong>
              <button
                type="button"
                onClick={handleCopyPath}
                className="text-[11px] text-[#38BDF8] hover:underline font-medium cursor-pointer"
              >
                {copiedPath ? '¡Copiada!' : 'Copiar ruta'}
              </button>
            </div>
            <code className="text-[11px] bg-[#0F172A] border border-[#94A3B8]/18 px-2 py-1 rounded break-all text-[#38BDF8]">
              {file_item.path}
            </code>
          </li>
          <li>
            <strong className="text-[#94A3B8]">Motor de inferencia:</strong>{' '}
            <span>{engine}</span>
          </li>
          <li>
            <strong className="text-[#94A3B8]">Similitud coseno:</strong>{' '}
            <span className="font-mono text-[#38BDF8] font-semibold">
              {(score * 100).toFixed(1)}%
            </span>
          </li>
          <li>
            <strong className="text-[#94A3B8]">Tamaño y tipo:</strong>{' '}
            <span>
              {formatBytes(file_item.file_size)} · {file_item.mime_type}
            </span>
          </li>
          <li>
            <strong className="text-[#94A3B8]">SHA-256 (Incremental Cache):</strong>{' '}
            <code className="text-[11px] text-[#94A3B8]">
              {file_item.sha256_hash.slice(0, 20)}…
            </code>
          </li>
        </ul>

        <div className="bg-[#0F172A] border border-[#94A3B8]/18 rounded-lg p-3 text-xs text-[#F8FAFC] leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap">
          <HighlightText text={relevant_snippet} query={query} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenPreview(file_item.path)}
            className="py-2 px-3 rounded-lg bg-[#38BDF8] hover:bg-[#7DD3FC] text-xs font-bold text-[#06101F] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>👁️ Previsualizar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenInOS}
            className="py-2 px-3 rounded-lg bg-[#1E293B] hover:bg-[#263349] border border-[#94A3B8]/25 text-xs font-semibold text-[#F8FAFC] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>📂 Abrir en OS</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAskAboutDocument(fileName)}
          className="w-full py-2 px-3 rounded-lg bg-[#1E293B] hover:bg-[#263349] border border-[#38BDF8]/40 text-xs font-semibold text-[#38BDF8] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>💬 Preguntar al asistente RAG sobre {fileName}</span>
        </button>
      </div>
    </aside>
  );
};
