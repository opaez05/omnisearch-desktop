import React from 'react';
import type { AppConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  config: AppConfig | null;
  onClose: () => void;
  onToggleAutostart: (enabled: boolean) => void;
  onResetSetup: () => void;
  onPickFolder: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onToggleAutostart,
  onResetSetup,
  onPickFolder,
}) => {
  if (!isOpen || !config) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg bg-[#0F172A] border border-[#38BDF8]/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#94A3B8]/18">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#38BDF8] font-semibold">
              Preferencias del Sistema
            </span>
            <h3 id="settings-modal-title" className="text-lg font-bold text-[#F8FAFC]">
              Configuración de OmniSearch Desktop
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#263349] text-[#CBD5E1] flex items-center justify-center cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Opción 1: Autostart */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0B1120] border border-[#94A3B8]/18">
            <div>
              <p className="font-semibold text-[#F8FAFC]">Iniciar con el sistema (Autostart)</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Arranca OmniSearch silenciosamente en la bandeja del sistema al iniciar sesión en tu SO.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.autostart}
              onChange={(e) => onToggleAutostart(e.target.checked)}
              className="w-5 h-5 accent-[#38BDF8] cursor-pointer shrink-0"
              aria-label="Iniciar con el sistema"
            />
          </div>

          {/* Opción 2: Carpeta vigilada */}
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-[#94A3B8]/18">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="font-semibold text-[#F8FAFC]">Carpeta local indexada</p>
              <button
                type="button"
                onClick={onPickFolder}
                className="text-xs text-[#38BDF8] hover:underline font-semibold cursor-pointer"
              >
                Cambiar carpeta
              </button>
            </div>
            <code className="block text-xs text-[#38BDF8] bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#94A3B8]/15 break-all">
              {config.indexed_folder}
            </code>
          </div>

          {/* Opción 3: Simulación de Primera Ejecución (Demo Docente) */}
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-[#94A3B8]/18 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#F8FAFC]">Estado de Configuración Inicial</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Flag <code className="text-[#38BDF8]">setup_completed: {String(config.setup_completed)}</code>. Puedes reiniciarlo para demostrar el flujo de 1ra ejecución.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetSetup}
              className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263349] border border-amber-400/40 text-amber-300 text-xs font-semibold shrink-0 cursor-pointer"
            >
              Reiniciar 1ra Ejecución
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#06101F] font-bold text-xs cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
