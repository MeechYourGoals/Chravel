import React from 'react';
import { BarChart3 } from 'lucide-react';

export const PollsEmptyState = () => {
  return (
    <div className="text-center py-10">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <BarChart3 size={28} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">No Polls Yet</h3>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">
        Create a poll to ask the group a question and gather votes in real time.
      </p>
    </div>
  );
};
