import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, onSearch }) => {
  return (
    <div className="flex items-center w-full bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-700">
      <svg className="w-6 h-6 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        className="w-full bg-transparent text-white text-xl outline-none placeholder-gray-500"
        placeholder="Buscar semánticamente..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
        autoFocus
      />
    </div>
  );
};
