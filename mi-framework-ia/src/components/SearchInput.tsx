import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isSearching?: boolean;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  inputRef,
  isSearching = false,
  placeholder = "Describe lo que buscas en tus archivos, contratos o notas...",
}) => {
  return (
    <div className="flex items-center w-full bg-[#0B1120] rounded-xl px-4 py-3 border border-[#38BDF8]/45 focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#38BDF8]/20 transition-all shadow-inner">
      <svg
        className="w-5 h-5 text-[#38BDF8] mr-3 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" strokeWidth={2.2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        aria-label="Búsqueda semántica en documentos locales"
        className="w-full bg-transparent text-[#F8FAFC] text-base outline-none placeholder-[#94A3B8]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] px-2 py-1 rounded mr-2 transition-colors cursor-pointer"
        >
          Limpiar
        </button>
      )}
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[11px] font-mono text-[#94A3B8] bg-[#1E293B] border border-[#94A3B8]/25 px-2 py-0.5 rounded mr-2 shrink-0">
        Ctrl+K
      </kbd>
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] bg-[#34D399]/12 border border-[#34D399]/30 px-3 py-1 rounded-full shrink-0">
        {isSearching ? (
          <>
            <span className="w-2.5 h-2.5 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin" />
            Buscando...
          </>
        ) : (
          '🔒 100% Local'
        )}
      </span>
    </div>
  );
};
