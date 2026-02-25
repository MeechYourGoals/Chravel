import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { TripTask } from '../../types/tasks';

interface TaskListProps {
  tasks: TripTask[];
  tripId: string;
  title: string;
  emptyMessage?: string;
  showCompleted?: boolean;
  onToggleCompleted?: () => void;
  onEditTask?: (task: TripTask) => void;
}

export const TaskList = ({
  tasks,
  tripId,
  title,
  emptyMessage,
  showCompleted,
  onToggleCompleted,
  onEditTask,
}: TaskListProps) => {
  const isCompletedSection = title.toLowerCase().includes('completed');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isCompletedSection ? (
          <button
            onClick={onToggleCompleted}
            className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors"
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
        <div className="text-center py-8 text-gray-400">
          <CheckCircle2 size={48} className="mx-auto mb-3 opacity-50" />
          <p>{emptyMessage || 'No tasks found'}</p>
        </div>
      ) : (
        (!isCompletedSection || showCompleted) && (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} tripId={tripId} onEdit={onEditTask} />
            ))}
          </div>
        )
      )}
    </div>
  );
};
