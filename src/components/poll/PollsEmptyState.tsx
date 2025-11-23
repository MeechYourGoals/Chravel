import React from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PollsEmptyStateProps {
  onAddClick: () => void;
}

export const PollsEmptyState = ({ onAddClick }: PollsEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
      <div className="bg-glass-enterprise-blue/10 p-4 rounded-full mb-4">
        <BarChart3 size={48} className="text-glass-enterprise-blue" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No polls yet</h3>
      <p className="text-gray-400 max-w-md mb-8">
        Create a poll to make group decisions easier. Vote on dates, destinations, activities, and more.
      </p>
      <Button
        onClick={onAddClick}
        className="bg-glass-enterprise-blue hover:bg-glass-enterprise-blue/90 text-white font-medium px-6 py-2 h-auto"
      >
        <Plus size={18} className="mr-2" />
        Create Poll
      </Button>
    </div>
  );
};
