import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';
import { Input } from './ui/input';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SearchBar = ({
  placeholder = 'Search trips, people, files...',
  onSearch,
  isLoading = false,
  className = '',
  style,
}: SearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={`relative ${className}`} style={style}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="pl-10 pr-10 bg-gray-900/80 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500/20 w-full min-w-0"
        />
        {isLoading && (
          <Loader
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-500 animate-spin"
            size={18}
          />
        )}
      </div>
    </div>
  );
};
