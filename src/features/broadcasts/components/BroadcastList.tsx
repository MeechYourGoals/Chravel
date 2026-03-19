import React from 'react';
import { BroadcastItem } from './BroadcastItem';
import { Radio } from 'lucide-react';
import { useLinkPreviews } from '@/features/chat/hooks/useLinkPreviews';

interface BroadcastData {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent' | 'emergency';
  recipients: string;
  responses: {
    coming: number;
    wait: number;
    cant: number;
  };
  userResponse?: 'coming' | 'wait' | 'cant';
}

interface BroadcastListProps {
  broadcasts: BroadcastData[];
  userResponses: Record<string, 'coming' | 'wait' | 'cant'>;
  onRespond: (broadcastId: string, response: 'coming' | 'wait' | 'cant') => void;
}

export const BroadcastList = ({ broadcasts, userResponses, onRespond }: BroadcastListProps) => {
  const linkPreviews = useLinkPreviews(
    broadcasts.map(broadcast => ({
      id: broadcast.id,
      text: broadcast.message,
      linkPreview: undefined,
    })),
  );

  if (broadcasts.length === 0) {
    return (
      <div className="text-center py-12">
        <Radio size={48} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-400 mb-2">No Recent Broadcasts</h3>
        <p className="text-slate-500 text-sm">Share quick updates and alerts with your group</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {broadcasts.map(broadcast => (
        <BroadcastItem
          key={broadcast.id}
          {...broadcast}
          linkPreview={linkPreviews[broadcast.id]}
          userResponse={userResponses[broadcast.id]}
          onRespond={onRespond}
        />
      ))}
    </div>
  );
};
