import React from 'react';
import { Calendar, User, Check, AlertTriangle, Clock } from 'lucide-react';
import { format, isAfter, formatDistanceToNow } from 'date-fns';
import { TripTask } from '../../types/tasks';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ResponsiveModal } from '../ui/responsive-modal';

interface TaskDetailModalProps {
  task: TripTask;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (task: TripTask) => void;
  userCompleted?: boolean;
}

export const TaskDetailModal = ({
  task,
  isOpen,
  onClose,
  onEdit,
  userCompleted,
}: TaskDetailModalProps) => {
  const completionCount = task.task_status?.filter(s => s.completed).length || 0;
  const totalUsers = task.task_status?.length || 1;
  const isOverdue = task.due_at && isAfter(new Date(), new Date(task.due_at)) && !userCompleted;
  const completionPercent = totalUsers > 0 ? Math.round((completionCount / totalUsers) * 100) : 0;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} dialogClassName="sm:max-w-md">
      <div className="flex items-center gap-2 mb-4">
        {userCompleted && (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-white" />
          </div>
        )}
        <h2 className="text-lg font-semibold">
          <span className={userCompleted ? 'text-muted-foreground line-through' : ''}>
            {task.title}
          </span>
        </h2>
      </div>

      <div className="space-y-4">
        {/* Description */}
        {task.description && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
            <p className="text-foreground">{task.description}</p>
          </div>
        )}

        {/* Due Date with overdue warning */}
        {task.due_at && (
          <div className="flex items-center gap-2">
            {isOverdue ? (
              <AlertTriangle size={16} className="text-red-400" />
            ) : (
              <Calendar size={16} className="text-muted-foreground" />
            )}
            <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : ''}`}>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {format(new Date(task.due_at), 'PPP')}
            </span>
            <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
              {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
            </Badge>
          </div>
        )}

        {/* Created info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {task.creator && (
            <div className="flex items-center gap-1.5">
              <User size={14} />
              <span>{task.creator.name || 'Unknown'}</span>
            </div>
          )}
          {task.created_at && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Group Task Progress with progress bar */}
        {task.is_poll && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Completion Progress</h4>
            <div className="space-y-2">
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-green-500 to-emerald-400"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {completionCount}/{totalUsers} completed
                </Badge>
                <span className="text-xs text-muted-foreground">{completionPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Task type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {task.is_poll ? 'Group Task' : 'Individual Task'}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          {onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit(task);
                onClose();
              }}
            >
              Edit Task
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
