import React from 'react';
import { CheckCircle2, Clock, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { TripTask } from '../../types/tasks';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';

interface TaskListProps {
  tasks: TripTask[];
  tripId: string;
  title: string;
  emptyMessage?: string;
  showCompleted?: boolean;
  onToggleCompleted?: () => void;
  onEditTask?: (task: TripTask) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Loading skeleton for a single task row */
const TaskRowSkeleton = () => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-24 hidden sm:block" />
      <div className="flex-1" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const TaskList = ({
  tasks,
  tripId,
  title,
  emptyMessage,
  showCompleted,
  onToggleCompleted,
  onEditTask,
  isLoading,
  error,
  onRetry,
}: TaskListProps) => {
  const isCompletedSection = title.toLowerCase().includes('completed');

  // Loading state with skeletons
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <Clock size={18} />
          <span>{title}</span>
        </div>
        <div className="space-y-2" aria-label="Loading tasks">
          <TaskRowSkeleton />
          <TaskRowSkeleton />
          <TaskRowSkeleton />
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <Clock size={18} />
          <span>{title}</span>
        </div>
        <div className="text-center py-8 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle size={48} className="mx-auto mb-3 text-red-400 opacity-70" />
          <p className="text-red-300 font-medium mb-1">Failed to load tasks</p>
          <p className="text-gray-400 text-sm mb-4">Something went wrong. Please try again.</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="min-h-[44px] border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              <RefreshCw size={14} className="mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isCompletedSection ? (
          <button
            onClick={onToggleCompleted}
            aria-label={showCompleted ? 'Collapse completed tasks' : 'Expand completed tasks'}
            aria-expanded={showCompleted}
            className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors min-h-[44px]"
          >
            <CheckCircle2 size={18} />
            <span>
              {title} ({tasks.length})
            </span>
            <span className="text-xs">{showCompleted ? '▼' : '▶'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-white font-medium">
            <Clock size={18} />
            <span>
              {title} ({tasks.length})
            </span>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl">
          <ClipboardList size={48} className="mx-auto mb-3 text-gray-500 opacity-50" />
          <p className="text-gray-400 font-medium">{emptyMessage || 'No tasks found'}</p>
          <p className="text-gray-500 text-sm mt-1">
            {isCompletedSection
              ? 'Completed tasks will appear here'
              : 'Create a task to get started'}
          </p>
        </div>
      ) : (
        (!isCompletedSection || showCompleted) && (
          <div className="space-y-2" role="list" aria-label={`${title} tasks`}>
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} tripId={tripId} onEdit={onEditTask} />
            ))}
          </div>
        )
      )}
    </div>
  );
};
