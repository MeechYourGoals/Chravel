import React, { useState } from 'react';
import { X, Calendar, Users, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { useTaskMutations } from '../../hooks/useTripTasks';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { format } from 'date-fns';

interface TaskCreateModalProps {
  tripId: string;
  onClose: () => void;
}

export const TaskCreateModal = ({ tripId, onClose }: TaskCreateModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [taskMode, setTaskMode] = useState<'solo' | 'poll'>('solo');
  const [showCalendar, setShowCalendar] = useState(false);
  
  const { createTaskMutation } = useTaskMutations(tripId);
  const { accentColors } = useTripVariant();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    createTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      due_at: dueDate?.toISOString(),
      is_poll: taskMode === 'poll'
    }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        setDueDate(undefined);
        setTaskMode('solo');
        onClose();
      },
      onError: (error) => {
        console.error('Task creation failed:', error);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={140}
              className="bg-gray-800 border-gray-600 text-white"
              autoFocus
            />
            <div className="text-xs text-gray-500 text-right">
              {title.length}/140
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-gray-300">Due Date (Optional)</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Calendar size={16} className="mr-2" />
                  {dueDate ? format(dueDate, 'PPP') : 'Set due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={(date) => date < new Date()}
                  className="text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Task Mode */}
          <div className="space-y-3">
            <Label className="text-gray-300">Task Type</Label>
            <RadioGroup value={taskMode} onValueChange={(value: 'solo' | 'poll') => setTaskMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solo" id="solo" />
                <Label htmlFor="solo" className="flex items-center gap-2 text-gray-300">
                  <User size={16} />
                  Single Task - One person completes this
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poll" id="poll" />
                <Label htmlFor="poll" className="flex items-center gap-2 text-gray-300">
                  <Users size={16} />
                  Group Task - Everyone needs to complete this
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createTaskMutation.isPending}
              className={`flex-1 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90`}
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};