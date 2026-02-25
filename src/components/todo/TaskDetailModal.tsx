import React from 'react';
import { X, Calendar, User, Check } from 'lucide-react';
import { format } from 'date-fns';
import { TripTask } from '../../types/tasks';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {userCompleted && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-white" />
              </div>
            )}
            <span className={userCompleted ? 'text-muted-foreground' : ''}>{task.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-foreground">{task.description}</p>
            </div>
          )}

          {/* Due Date */}
          {task.due_at && (
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-sm">Due: {format(new Date(task.due_at), 'PPP')}</span>
            </div>
          )}

          {/* Creator */}
          {task.creator && (
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm">Created by: {task.creator.name || 'Unknown'}</span>
            </div>
          )}

          {/* Group Task Progress */}
          {task.is_poll && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Completion Progress
              </h4>
              <Badge variant="secondary">
                {completionCount}/{totalUsers} completed
              </Badge>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  );
};
