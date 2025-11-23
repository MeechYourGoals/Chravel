
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Crown, MessageCircle, UserPlus } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTripVariant } from '../../contexts/TripVariantContext';

interface ProTripDetailHeaderProps {
  tripContext: any;
  showInbox: boolean;
  onToggleInbox: () => void;
  onShowInvite: () => void;
  onShowTripSettings: () => void;
  onShowAuth: () => void;
}

export const ProTripDetailHeader = ({
  tripContext,
  showInbox,
  onToggleInbox,
  onShowInvite,
  onShowTripSettings,
  onShowAuth
}: ProTripDetailHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accentColors } = useTripVariant();

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
      >
        <div className="bg-gray-800 p-2 rounded-lg shadow-lg group-hover:shadow-yellow-500/20 transition-all border border-gray-700 hover:border-yellow-500/50">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Back to Trips</span>
      </button>

      <div className="flex items-center gap-3">
        {/* Pro Badge */}
        <div className={`bg-gradient-to-r ${accentColors.gradient} backdrop-blur-sm border border-yellow-500/30 rounded-xl px-4 py-2 flex items-center gap-2`}>
          <Crown size={16} className="text-white" />
          <span className="text-white font-medium">PRO</span>
        </div>

      </div>
    </div>
  );
};
