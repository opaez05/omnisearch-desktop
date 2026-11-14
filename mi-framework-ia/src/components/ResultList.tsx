import React from 'react';
import type { SearchResult } from '../types';
import { HighlightText } from './HighlightText';

interface ResultListProps {
  results: SearchResult[];
  selectedId: string | null;
  onSelect: (result: SearchResult, key: string) => void;
  hasSearched: boolean;
  query: string;
}

export function extractFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

export function getResultUniqueKey(result: SearchResult, index: number): string {
  return result.metadata?.chunk_id || `${result.file_item.id}_${index}`;
}

export const ResultList: React.FC<ResultListProps> = ({
  results,
  selectedId,
  onSelect,
  hasSearched,
  query,
}) => {
  if (results.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[260px] p-6 text-center text-[#94A3B8]"
        role="status"
        aria-live="polite"
      >
        <svg
          className="w-10 h-10 text-[#38BDF8]/50 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm font-medium text-[#CBD5E1]">
          {hasSearched
            ? 'No se encontraron fragmentos que coincidan con tu consulta.'
            : 'Escribe una consulta (Ctrl+K) o elige un prompt rápido para explorar tus archivos.'}
        </p>
        <p className="text-xs text-[#94A3B8] mt-1">
          Puedes cambiar la carpeta indexada en cualquier momento desde la barra superior.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[460px]"
      role="listbox"
      aria-label="Resultados de búsqueda semántica"
    >
      {results.map((result, index) => {
        const uniqueKey = getResultUniqueKey(result, index);
        const isSelected = uniqueKey === selectedId;
        const fileName = extractFileName(result.file_item.path);
        const matchPct = `${(result.score * 100).toFixed(1)}%`;
        const chunkInfo = result.metadata?.chunk_index
          ? `Chunk ${result.metadata.chunk_index}/${result.metadata.total_chunks || '?'}`
          : result.file_item.mime_type;

        return (
          <div
            key={uniqueKey}
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            onClick={() => onSelect(result, uniqueKey)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(result, uniqueKey);
              }
            }}
            className={`rounded-xl p-3.5 cursor-pointer transition-all border text-left ${
              isSelected
                ? 'bg-[#38BDF8]/10 border-[#38BDF8] shadow-md'
                : 'bg-[#0B1120] border-[#94A3B8]/18 hover:border-[#38BDF8]/50 hover:bg-[#1E293B]/60'
            }`}
          >
            <div className="flex justify-between items-center gap-2 mb-1.5">
              <h3 className="text-[#F8FAFC] font-semibold text-sm truncate" title={fileName}>
                {fileName}
              </h3>
              <span className="font-mono text-xs text-[#38BDF8] bg-[#38BDF8]/14 border border-[#38BDF8]/40 px-2.5 py-0.5 rounded-full shrink-0">
                {matchPct}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mb-1.5">
              <span>{result.file_item.mime_type}</span>
              <span>•</span>
              <span>{chunkInfo}</span>
            </div>
            <p className="text-[#CBD5E1] text-xs line-clamp-2 leading-relaxed">
              <HighlightText text={result.relevant_snippet} query={query} />
            </p>
          </div>
        );
      })}
    </div>
  );
};
