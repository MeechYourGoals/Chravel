import React from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { useTripVariant } from '@/contexts/TripVariantContext';

interface TasksEmptyStateProps {
  onCreateTask: () => void;
}

export const TasksEmptyState = ({ onCreateTask }: TasksEmptyStateProps) => {
  const { accentColors } = useTripVariant();

  return (
    <div className="text-center py-16 px-4">
      <div
        className={`w-24 h-24 bg-gradient-to-br ${accentColors.gradient} opacity-20 rounded-full flex items-center justify-center mx-auto mb-6`}
      >
        <CheckSquare size={40} className={`text-${accentColors.primary}`} />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-white">No tasks yet</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Stay organized! Create tasks to keep track of everything that needs to get done for this
        trip.
      </p>
      <Button
        onClick={onCreateTask}
        className={`inline-flex items-center gap-2 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg`}
      >
        <Plus size={20} />
        Create Your First Task
      </Button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Assign & Track</h4>
          <p className="text-sm text-gray-400">
            Assign tasks to trip members and track completion in real-time
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Set Deadlines</h4>
          <p className="text-sm text-gray-400">
            Add due dates to ensure everything gets done on time
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Stay Organized</h4>
          <p className="text-sm text-gray-400">
            Filter by status, assignee, and date to stay on top of tasks
          </p>
        </div>
      </div>
    </div>
  );
};
