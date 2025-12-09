import React from 'react';
import { MessageCircle } from 'lucide-react';
import { PollComponent } from './PollComponent';

interface CommentsWallProps {
  tripId: string;
}

export const CommentsWall = ({ tripId }: CommentsWallProps) => {

  return (
    <div className="p-4 space-y-3 bg-glass-slate-bg rounded-2xl">
      {/* Polls Section */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <MessageCircle size={18} className="text-glass-enterprise-blue" />
          Group Polls
        </h3>
        <PollComponent tripId={tripId} />
      </div>
    </div>
  );
};
