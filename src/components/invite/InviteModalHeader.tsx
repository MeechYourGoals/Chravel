import React from 'react';
import { X } from 'lucide-react';

interface InviteModalHeaderProps {
  tripName: string;
  onClose: () => void;
}

export const InviteModalHeader = ({ tripName, onClose }: InviteModalHeaderProps) => {
  return (
    <>
      {/* Close Button - Fixed Position */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        title="Close"
      >
        <X size={20} />
      </button>

      {/* Header Content */}
      <div className="mb-3 pr-10">
        <h2 className="text-xl font-bold text-white">Invite to Trip</h2>
        <p className="text-gray-400 text-sm">{tripName}</p>
      </div>
    </>
  );
};
