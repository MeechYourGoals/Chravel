import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BroadcastPriority } from '../hooks/useBroadcastFilters';

interface BroadcastFiltersProps {
  priority: BroadcastPriority;
  onPriorityChange: (priority: BroadcastPriority) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const BroadcastFilters = ({ 
  priority, 
  onPriorityChange, 
  hasActiveFilters,
  onClearFilters 
}: BroadcastFiltersProps) => {
  const priorities: BroadcastPriority[] = ['all', 'chill', 'logistics', 'urgent'];

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Filter size={16} />
        <span>Filter:</span>
      </div>
      
      <div className="flex gap-2">
        {priorities.map((p) => (
          <button
            key={p}
            onClick={() => onPriorityChange(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              priority === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-slate-400 hover:text-white"
        >
          <X size={14} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
