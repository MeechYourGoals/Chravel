import React from 'react';

export type MediaFilterType = 'all' | 'photos' | 'videos' | 'files' | 'links';

interface MediaFiltersProps {
  activeFilter: MediaFilterType;
  onFilterChange: (filter: MediaFilterType) => void;
}

export const MediaFilters = ({ activeFilter, onFilterChange }: MediaFiltersProps) => {
  const filters: { value: MediaFilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'photos', label: 'Photos' },
    { value: 'videos', label: 'Videos' },
    { value: 'files', label: 'Files' },
    { value: 'links', label: 'Links' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeFilter === filter.value
              ? 'bg-blue-600 text-white'
              : 'border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};
