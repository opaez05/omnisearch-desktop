import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { extractFileName } from './ResultList';
import { HighlightText } from './HighlightText';

interface FilePreviewPayload {
  kind: 'pdf' | 'text';
  mime_type: string;
  content: string;
  truncated: boolean;
}

interface FilePreviewModalProps {
  filePath: string | null;
  query: string;
  onClose: () => void;
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  filePath,
  query,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<FilePreviewPayload | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;

    let activeUrl: string | null = null;
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      setPayload(null);
      setPdfUrl(null);

      try {
        const res = await invoke<FilePreviewPayload>('read_file_preview', {
          path: filePath,
        });
        if (cancelled) return;
        setPayload(res);
        if (res.kind === 'pdf') {
          activeUrl = base64ToBlobUrl(res.content, 'application/pdf');
          setPdfUrl(activeUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(typeof err === 'string' ? err : 'No se pudo cargar la vista previa.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [filePath]);

  useEffect(() => {
    if (!filePath) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filePath, onClose]);

  if (!filePath) return null;

  const fileName = extractFileName(filePath);

  const handleOpenInOS = async () => {
    try {
      await invoke('open_file_in_os', { path: filePath });
    } catch (e) {
      console.error('Error opening file:', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${fileName}`}
    >
      <div className="w-full max-w-5xl h-[85vh] bg-[#0F172A] border border-[#38BDF8]/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header del Modal */}
        <div className="px-5 py-3.5 bg-[#080D19] border-b border-[#94A3B8]/18 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#38BDF8] bg-[#38BDF8]/12 px-2 py-0.5 rounded">
                Vista Previa Local
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                {fileName}
              </h3>
            </div>
            <p className="text-[11px] font-mono text-[#94A3B8] truncate mt-0.5">
              {filePath}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenInOS}
              className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263349] border border-[#94A3B8]/25 text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer"
            >
              📂 Abrir en el sistema
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#263349] text-[#CBD5E1] hover:text-white flex items-center justify-center text-lg cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden p-4 bg-[#0B1120]">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] gap-3">
              <span className="w-7 h-7 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando documento local...</span>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <p className="text-sm text-amber-300">{error}</p>
              <button
                type="button"
                onClick={handleOpenInOS}
                className="px-4 py-2 rounded-xl bg-[#38BDF8] text-[#06101F] text-xs font-bold cursor-pointer"
              >
                Abrir con aplicación predeterminada
              </button>
            </div>
          )}

          {!loading && !error && payload?.kind === 'pdf' && pdfUrl && (
            <iframe
              src={pdfUrl}
              title={fileName}
              className="w-full h-full rounded-xl border border-[#94A3B8]/20 bg-white"
            />
          )}

          {!loading && !error && payload?.kind === 'text' && (
            <div className="h-full overflow-y-auto rounded-xl border border-[#94A3B8]/20 bg-[#0F172A] p-4 font-mono text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
              {payload.truncated && (
                <div className="mb-3 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                  Mostrando los primeros 256 KB del archivo para mantener la fluidez. Usa &quot;Abrir en el sistema&quot; para verlo completo.
                </div>
              )}
              <HighlightText text={payload.content} query={query} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
