import React, { useState } from 'react';
import { Pencil, Trash2, CheckCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CompletionDrawer } from './CompletionDrawer';
import { useTripTasks } from '../../hooks/useTripTasks';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { TripTask } from '../../types/tasks';
import { hapticService } from '../../services/hapticService';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../hooks/useDemoMode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface TaskRowProps {
  task: TripTask;
  tripId: string;
  onEdit?: (task: TripTask) => void;
}

export const TaskRow = ({ task, tripId, onEdit }: TaskRowProps) => {
  const [showCompletionDrawer, setShowCompletionDrawer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const { toggleTaskMutation, deleteTaskMutation } = useTripTasks(tripId);

  const isCompleted = task.is_poll 
    ? (task.task_status?.filter(s => s.completed).length || 0) >= (task.task_status?.length || 1)
    : task.task_status?.[0]?.completed || false;

  const isOverdue = task.due_at && isAfter(new Date(), new Date(task.due_at)) && !isCompleted;
  
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const getCurrentUserId = () => {
    if (isDemoMode || !user) {
      return 'demo-user';
    }
    return user.id;
  };
  
  const currentUserId = getCurrentUserId();
  const currentUserStatus = task.task_status?.find(s => s.user_id === currentUserId);
  const userCompleted = currentUserStatus?.completed || false;

  const completionCount = task.task_status?.filter(s => s.completed).length || 0;
  const totalUsers = task.task_status?.length || 1;

  const handleToggleComplete = () => {
    const willBeCompleted = !userCompleted;
    
    if (willBeCompleted) {
      hapticService.success();
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 1000);
    } else {
      hapticService.light();
    }
    
    toggleTaskMutation.mutate({
      taskId: task.id,
      completed: willBeCompleted
    });
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate(task.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:bg-white/10 ${
        userCompleted ? 'opacity-75' : ''
      }`}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Checkbox with Animation */}
          <div className="relative flex-shrink-0">
            <Checkbox
              checked={userCompleted}
              onCheckedChange={handleToggleComplete}
            />
            {justCompleted && (
              <div className="absolute -inset-2 pointer-events-none">
                <CheckCircle 
                  className="w-6 h-6 text-green-400 animate-scale-in" 
                  fill="currentColor"
                />
              </div>
            )}
          </div>

          {/* Title - strikethrough on personal completion */}
          <span className={`font-medium text-white ${userCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>

          {/* Description */}
          {task.description && (
            <>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-muted-foreground text-sm truncate max-w-[200px]">
                {task.description}
              </span>
            </>
          )}

          {/* Due Date */}
          {task.due_at && (
            <>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <Badge 
                variant={isOverdue ? 'destructive' : 'secondary'}
                className="text-xs flex-shrink-0"
              >
                {isOverdue ? 'Overdue' : 'Due'} {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
              </Badge>
            </>
          )}

          {/* Group Task Progress */}
          {task.is_poll && (
            <>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompletionDrawer(true)}
                className="text-xs text-muted-foreground hover:text-white px-2 h-7"
              >
                {completionCount}/{totalUsers} done
              </Button>
            </>
          )}

          {/* Spacer to push actions to right */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
              >
                <Pencil size={14} className="mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-7 px-2 text-xs text-destructive hover:text-destructive/80"
            >
              <Trash2 size={14} className="mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Completion Drawer for Group Tasks */}
      {showCompletionDrawer && (
        <CompletionDrawer
          task={task}
          onClose={() => setShowCompletionDrawer(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
