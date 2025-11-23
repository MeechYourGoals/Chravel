import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TasksEmptyStateProps {
  onAddClick: () => void;
}

export const TasksEmptyState = ({ onAddClick }: TasksEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
      <div className="bg-primary/10 p-4 rounded-full mb-4">
        <CheckCircle2 size={48} className="text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No tasks yet</h3>
      <p className="text-gray-400 max-w-md mb-8">
        Create tasks to keep track of everything that needs to get done for your trip. Assign tasks to friends and track progress.
      </p>
      <Button
        onClick={onAddClick}
        className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2 h-auto"
      >
        <Plus size={18} className="mr-2" />
        Create New Task
      </Button>
    </div>
  );
};
