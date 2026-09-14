import React from 'react';
import type { SearchResult } from '../types';

interface ResultListProps {
  results: SearchResult[];
}

export const ResultList: React.FC<ResultListProps> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden max-h-[400px] overflow-y-auto">
      <ul className="divide-y divide-gray-700">
        {results.map((result, index) => (
          <li key={index} className="p-4 hover:bg-gray-700 cursor-pointer transition-colors duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-medium text-lg truncate">
                  {result.file_item.path.split('/').pop() || result.file_item.path}
                </h3>
                <p className="text-gray-400 text-sm mt-1">{result.file_item.path}</p>
                <p className="text-gray-300 text-sm mt-2 italic">
                  "{result.relevant_snippet}"
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  {(result.score * 100).toFixed(1)}% match
                </span>
                <span className="text-xs text-gray-500 mt-2">
                  {result.file_item.mime_type}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
