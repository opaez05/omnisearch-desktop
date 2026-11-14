import React from 'react';

interface WelcomeSetupModalProps {
  isOpen: boolean;
  showCloseWarning: boolean;
  isSubmitting: boolean;
  onCompleteSetup: (hideToTray: boolean) => void;
}

export const WelcomeSetupModal: React.FC<WelcomeSetupModalProps> = ({
  isOpen,
  showCloseWarning,
  isSubmitting,
  onCompleteSetup,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-setup-title"
    >
      <div className="w-full max-w-md bg-[#0F172A] border border-[#38BDF8]/50 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] flex items-center justify-center mx-auto mb-4 text-xl">
          ⚡
        </div>

        <span className="font-mono text-[11px] uppercase tracking-wider text-[#38BDF8] font-semibold">
          Primera Ejecución · Configuración Inicial
        </span>
        <h2 id="welcome-setup-title" className="text-xl font-bold text-[#F8FAFC] mt-1 mb-2">
          Bienvenido a OmniSearch Desktop
        </h2>
        <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed mb-5">
          Esta es tu primera ejecución en <strong>Modo Ventana Completa</strong>. Al completar la configuración inicial, OmniSearch activará su integración con la <strong>Bandeja del Sistema (System Tray)</strong> junto al reloj para que puedas invocarlo al instante sin ocupar espacio en tu barra de tareas.
        </p>

        {showCloseWarning && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs">
            ⚠️ Debes completar la configuración inicial antes de poder minimizar u ocultar la aplicación en la bandeja del sistema.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onCompleteSetup(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#06101F] font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Completar configuración inicial'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onCompleteSetup(true)}
            className="w-full py-2 px-4 rounded-xl bg-[#1E293B] hover:bg-[#263349] border border-[#94A3B8]/25 text-[#CBD5E1] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Completar y probar ahora el Popup de Bandeja (360×500)
          </button>
        </div>
      </div>
    </div>
  );
};
