import React from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '../../ui/button';
import { ChannelWithStats } from '../../../types/channels';

interface ChannelMembersModalProps {
  channel: ChannelWithStats;
  onClose: () => void;
  isAdmin: boolean;
}

export const ChannelMembersModal: React.FC<ChannelMembersModalProps> = ({
  channel,
  onClose,
  isAdmin
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Channel Members ({channel.member_count})
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-gray-400 text-center py-8">
            Member list coming soon
          </p>
        </div>

        {isAdmin && (
          <Button className="w-full bg-primary hover:bg-primary/90">
            <UserPlus size={16} className="mr-2" />
            Add Members
          </Button>
        )}
      </div>
    </div>
  );
};
