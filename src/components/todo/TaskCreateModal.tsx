import React from 'react';
import { ResponsiveModal } from '../ui/responsive-modal';
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
    <ResponsiveModal
      open
      onOpenChange={onClose}
      title={isEditMode ? 'Edit Task' : 'Create New Task'}
      dialogClassName="sm:max-w-md bg-glass-slate-card border-glass-slate-border"
    >
      <TaskCreateForm tripId={tripId} onClose={onClose} initialTask={initialTask} hideHeader />
    </ResponsiveModal>
  );
};
