import React from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { useTripVariant } from '@/contexts/TripVariantContext';

interface PollsEmptyStateProps {
  onCreatePoll: () => void;
}

export const PollsEmptyState = ({ onCreatePoll }: PollsEmptyStateProps) => {
  const { accentColors } = useTripVariant();

  return (
    <div className="text-center py-6 px-4">
      <div className={`w-16 h-16 bg-gradient-to-br ${accentColors.gradient} opacity-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
        <BarChart3 size={28} className={`text-${accentColors.primary}`} />
      </div>
      <h3 className="text-lg font-bold mb-2 text-white">No polls yet</h3>
      <p className="text-gray-400 mb-4 max-w-sm mx-auto text-sm">
        Create polls to get everyone's input on destinations, activities, and more.
      </p>
      <Button
        onClick={onCreatePoll}
        className={`inline-flex items-center gap-2 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white px-6 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 shadow-lg`}
      >
        <Plus size={16} />
        Create Poll
      </Button>

      <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium mb-1 text-white text-sm">Group Decisions</h4>
          <p className="text-xs text-gray-400">Vote on plans and activities</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium mb-1 text-white text-sm">Real-Time Results</h4>
          <p className="text-xs text-gray-400">See votes update live</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium mb-1 text-white text-sm">Multiple Options</h4>
          <p className="text-xs text-gray-400">Add as many choices as needed</p>
        </div>
      </div>
    </div>
  );
};
