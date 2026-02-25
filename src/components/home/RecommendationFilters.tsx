import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Hotel, UtensilsCrossed, MapPin, Camera, Star, Car } from 'lucide-react';
import { SearchBar } from '../SearchBar';

interface RecommendationFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  showInlineSearch?: boolean;
}

const filters = [
  { id: 'all', label: 'All', icon: Star },
  { id: 'hotel', label: 'Hotels', icon: Hotel },
  { id: 'restaurant', label: 'Dining', icon: UtensilsCrossed },
  { id: 'activity', label: 'Activities', icon: MapPin },
  { id: 'tour', label: 'Tours', icon: Camera },
  { id: 'experience', label: 'Experiences', icon: Star },
  { id: 'transportation', label: 'Transportation', icon: Car },
];

export const RecommendationFilters = ({
  activeFilter,
  onFilterChange,
  showInlineSearch,
}: RecommendationFiltersProps) => {
  return (
    <div className="space-y-4">
      {showInlineSearch && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div
            className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide native-scroll flex-nowrap md:pb-0 px-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filters.map(filter => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;

              return (
                <Button
                  key={filter.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={`flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-border/50 hover:border-accent/50'
                  }`}
                  onClick={() => onFilterChange(filter.id)}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
          <div className="w-full md:w-80">
            <SearchBar placeholder="Search city or location..." className="w-full" />
          </div>
        </div>
      )}

      {!showInlineSearch && (
        <div
          className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide native-scroll flex-nowrap px-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filters.map(filter => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;

            return (
              <Button
                key={filter.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'border-border/50 hover:border-accent/50'
                }`}
                onClick={() => onFilterChange(filter.id)}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
