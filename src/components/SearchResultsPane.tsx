import React from 'react';
import {
  FileText,
  Calendar,
  Receipt,
  MessageSquare,
  MapPin,
  Users,
  ExternalLink,
} from 'lucide-react';
import { SearchResult } from '../services/universalConciergeService';

interface SearchResultsPaneProps {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
}

export const SearchResultsPane = ({ results, onResultClick }: SearchResultsPaneProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText size={16} className="text-blue-400" />;
      case 'receipt':
        return <Receipt size={16} className="text-green-400" />;
      case 'calendar_event':
        return <Calendar size={16} className="text-purple-400" />;
      case 'message':
        return <MessageSquare size={16} className="text-yellow-400" />;
      case 'place':
        return <MapPin size={16} className="text-red-400" />;
      case 'participant':
        return <Users size={16} className="text-indigo-400" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else {
      // Navigate to the deep link
      const element = document.querySelector(result.deepLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (results.length === 0) return null;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Search Results</span>
      </div>

      <div className="space-y-2">
        {results.map(result => (
          <div
            key={result.id}
            onClick={() => handleResultClick(result)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-white/20"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(result.objectType)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {result.objectType.replace('_', ' ')}
                  </span>
                  {result.metadata?.amount && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                      ${result.metadata.amount}
                    </span>
                  )}
                </div>

                <p className="text-white text-sm font-medium mb-1 line-clamp-1">{result.snippet}</p>

                <p className="text-gray-400 text-xs line-clamp-2">{result.content}</p>

                {(result.metadata?.date || result.metadata?.fileName) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {result.metadata.date && <span>📅 {result.metadata.date}</span>}
                    {result.metadata.fileName && <span>📎 {result.metadata.fileName}</span>}
                  </div>
                )}
              </div>

              <ExternalLink size={14} className="text-gray-500 flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
