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
    <div className="text-center py-16 px-4">
      <div className={`w-24 h-24 bg-gradient-to-br ${accentColors.gradient} opacity-20 rounded-full flex items-center justify-center mx-auto mb-6`}>
        <BarChart3 size={40} className={`text-${accentColors.primary}`} />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-white">No polls yet</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Make group decisions easy! Create polls to get everyone's input on destinations, activities, and more.
      </p>
      <Button
        onClick={onCreatePoll}
        className={`inline-flex items-center gap-2 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg`}
      >
        <Plus size={20} />
        Create Your First Poll
      </Button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Group Decisions</h4>
          <p className="text-sm text-gray-400">Let everyone vote on trip plans and activities</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Real-Time Results</h4>
          <p className="text-sm text-gray-400">See voting results update live as people respond</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Multiple Options</h4>
          <p className="text-sm text-gray-400">Add as many choices as you need for any decision</p>
        </div>
      </div>
    </div>
  );
};
