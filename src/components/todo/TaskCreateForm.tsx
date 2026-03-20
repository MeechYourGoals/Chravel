import React, { useState } from 'react';
import { Calendar, Users, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { useTripTasks } from '../../hooks/useTripTasks';
import { TripTask } from '../../types/tasks';
import { useToast } from '../../hooks/use-toast';

import { CollaboratorSelector } from './CollaboratorSelector';
import { format } from 'date-fns';

interface TaskCreateFormProps {
  tripId: string;
  onClose: () => void;
  initialTask?: TripTask;
  isInlineEmptyState?: boolean;
  hideHeader?: boolean;
}

export const TaskCreateForm = ({
  tripId,
  onClose,
  initialTask,
  isInlineEmptyState = false,
  hideHeader = false,
}: TaskCreateFormProps) => {
  const isEditMode = !!initialTask;
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialTask?.due_at ? new Date(initialTask.due_at) : undefined,
  );
  const [taskMode, setTaskMode] = useState<'solo' | 'poll'>(initialTask?.is_poll ? 'poll' : 'solo');
  const [showCalendar, setShowCalendar] = useState(false);
  const [assignedMembers, setAssignedMembers] = useState<string[]>(
    initialTask?.task_status?.map(status => status.user_id) ?? [],
  );

  const { createTaskMutation, updateTaskMutation } = useTripTasks(tripId);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_at: dueDate?.toISOString(),
      is_poll: taskMode === 'poll',
      assignedTo: assignedMembers,
    };

    if (initialTask) {
      updateTaskMutation.mutate(
        {
          taskId: initialTask.id,
          ...payload,
        },
        {
          onSuccess: () => {
            onClose();
          },
          onError: (error: unknown) => {
            if (import.meta.env.DEV) {
              console.error('Task update failed:', error);
            }
            toast({
              title: 'Update failed',
              description: 'Could not update the task. Please try again.',
              variant: 'destructive',
            });
          },
        },
      );
      return;
    }

    createTaskMutation.mutate(payload, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        setDueDate(undefined);
        setTaskMode('solo');
        setAssignedMembers([]);
        onClose();
      },
      onError: (error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('Task creation failed:', error);
        }
        toast({
          title: 'Creation failed',
          description: 'Could not create the task. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div
      className={
        isInlineEmptyState
          ? 'bg-glass-slate-card border border-glass-slate-border rounded-2xl p-6 shadow-enterprise-lg'
          : ''
      }
    >
      {isInlineEmptyState && !hideHeader && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Add the first task for this trip</h3>
          <p className="text-sm text-gray-400 mt-1">
            Keep everyone on track with shared tasks and deadlines
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="task-title" className="text-gray-300">
            Task Title
          </Label>
          <Input
            id="task-title"
            aria-label="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            maxLength={140}
            className="bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500 min-h-[44px]"
            autoFocus={!isInlineEmptyState}
          />
          <div className="text-xs text-gray-500 text-right">{title.length}/140</div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="task-description" className="text-gray-300">
            Description (Optional)
          </Label>
          <Textarea
            id="task-description"
            aria-label="Task description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add more details..."
            className="bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500 min-h-[80px]"
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label className="text-gray-300">Due Date (Optional)</Label>
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-label="Set due date"
                className="w-full justify-start text-left bg-glass-slate-bg border-glass-slate-border text-white hover:bg-glass-slate-card min-h-[44px]"
              >
                <Calendar size={16} className="mr-2" />
                {dueDate ? format(dueDate, 'PPP') : 'Set due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-glass-slate-card border-glass-slate-border">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={date => {
                  setDueDate(date);
                  setShowCalendar(false);
                }}
                disabled={date => date < new Date()}
                className="text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Task Mode */}
        <div className="space-y-3">
          <Label className="text-gray-300">Task Type</Label>
          <RadioGroup
            value={taskMode}
            onValueChange={(value: 'solo' | 'poll') => setTaskMode(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solo" id="task-solo" />
              <Label htmlFor="task-solo" className="flex items-center gap-2 text-gray-300">
                <User size={16} />
                Single Task - Assign to specific people
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="poll" id="task-poll" />
              <Label htmlFor="task-poll" className="flex items-center gap-2 text-gray-300">
                <Users size={16} />
                Group Task - Everyone needs to complete this
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Assignment Section */}
        <CollaboratorSelector
          tripId={tripId}
          selectedMembers={assignedMembers}
          onMembersChange={setAssignedMembers}
          isSingleTask={taskMode === 'solo'}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {!isInlineEmptyState && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-glass-slate-border text-gray-300 hover:bg-glass-slate-bg hover:text-white min-h-[44px]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!title.trim() || createTaskMutation.isPending || updateTaskMutation.isPending}
            className="flex-1 min-h-[44px]"
          >
            {isEditMode
              ? updateTaskMutation.isPending
                ? 'Saving...'
                : 'Save Changes'
              : createTaskMutation.isPending
                ? 'Creating...'
                : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
};
