import React from 'react';
import { Calendar, Users, FileText, Receipt, MessageCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SearchResult {
  id: string;
  objectType: 'trip' | 'collaborator' | 'calendar_event' | 'receipt' | 'file' | 'message';
  objectId: string;
  tripId: string;
  tripName: string;
  content: string;
  snippet: string;
  score: number;
  deepLink?: string;
  matchReason?: string; // New field for showing how the result matched
}

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  isLoading?: boolean;
}

const getResultIcon = (type: string) => {
  switch (type) {
    case 'trip':
      return MapPin;
    case 'collaborator':
      return Users;
    case 'calendar_event':
      return Calendar;
    case 'receipt':
      return Receipt;
    case 'file':
      return FileText;
    case 'message':
      return MessageCircle;
    default:
      return FileText;
  }
};

const getResultTypeLabel = (type: string) => {
  switch (type) {
    case 'trip':
      return 'Trip';
    case 'collaborator':
      return 'Person';
    case 'calendar_event':
      return 'Event';
    case 'receipt':
      return 'Receipt';
    case 'file':
      return 'File';
    case 'message':
      return 'Message';
    default:
      return 'Item';
  }
};

export const SearchResults = ({ results, onResultClick, isLoading }: SearchResultsProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl p-6 text-center">
        <p className="text-gray-400">No results found</p>
      </div>
    );
  }

  // Group results by trip
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.tripId]) {
        acc[result.tripId] = {
          tripName: result.tripName,
          results: [],
        };
      }
      acc[result.tripId].results.push(result);
      return acc;
    },
    {} as Record<string, { tripName: string; results: SearchResult[] }>,
  );

  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl p-6 max-h-96 overflow-y-auto">
      <h3 className="text-white font-semibold mb-4">Search Results ({results.length})</h3>

      {Object.entries(groupedResults).map(([tripId, group]) => (
        <div key={tripId} className="mb-6 last:mb-0">
          <h4 className="text-yellow-400 font-medium mb-3 text-sm">{group.tripName}</h4>

          <div className="space-y-2">
            {group.results.map(result => {
              const Icon = getResultIcon(result.objectType);

              return (
                <button
                  key={result.id}
                  onClick={() => onResultClick(result)}
                  className="w-full flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <Icon size={16} className="text-gray-400 mt-1 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                        {getResultTypeLabel(result.objectType)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Score: {Math.round(result.score * 100)}%
                      </span>
                      {result.matchReason && (
                        <span className="text-xs text-yellow-400">{result.matchReason}</span>
                      )}
                    </div>

                    <p className="text-white text-sm line-clamp-2">{result.snippet}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
