import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { TripTask } from '../../types/tasks';
import { TaskCreateForm } from './TaskCreateForm';

interface TaskCreateModalProps {
  tripId: string;
  onClose: () => void;
  initialTask?: TripTask;
}

export const TaskCreateModal = ({ tripId, onClose, initialTask }: TaskCreateModalProps) => {
  const isEditMode = !!initialTask;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-glass-slate-card border-glass-slate-border">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        <TaskCreateForm tripId={tripId} onClose={onClose} initialTask={initialTask} hideHeader />
      </DialogContent>
    </Dialog>
  );
};
