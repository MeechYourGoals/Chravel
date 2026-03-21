import React from 'react';
import { X } from 'lucide-react';

interface InviteModalHeaderProps {
  tripName: string;
  onClose: () => void;
}

export const InviteModalHeader = ({ tripName, onClose }: InviteModalHeaderProps) => {
  return (
    <>
      {/* Close Button - Fixed Position, 44px touch target */}
      <button
        onClick={onClose}
        aria-label="Close invite modal"
        className="absolute top-4 right-4 z-10 hover:bg-white/20 text-white min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-colors"
      >
        <X size={20} />
      </button>

      {/* Header Content */}
      <div className="mb-3 pr-12">
        <h2 id="invite-modal-title" className="text-xl font-bold text-white">
          Invite to Trip
        </h2>
        <p className="text-gray-400 text-sm">{tripName}</p>
      </div>
    </>
  );
};
