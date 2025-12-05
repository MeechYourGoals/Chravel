import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import { TaskStatus, TaskSortBy } from '../../hooks/useTripTasks';

interface TaskFiltersProps {
  status: TaskStatus;
  sortBy: TaskSortBy;
  onStatusChange: (status: TaskStatus) => void;
  onSortChange: (sortBy: TaskSortBy) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const TaskFilters = ({ 
  status, 
  sortBy,
  onStatusChange, 
  onSortChange,
  hasActiveFilters,
  onClearFilters 
}: TaskFiltersProps) => {
  const statuses: TaskStatus[] = ['all', 'open', 'completed'];
  const sortOptions: { value: TaskSortBy; label: string }[] = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'created', label: 'Created' },
    { value: 'priority', label: 'Priority' }
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Filter size={16} />
        <span>Filter:</span>
      </div>
      
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-slate-400 text-sm">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as TaskSortBy)}
          className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
