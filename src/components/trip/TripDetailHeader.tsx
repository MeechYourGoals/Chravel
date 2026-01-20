
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Settings, UserPlus } from 'lucide-react';

import { useTripVariant } from '../../contexts/TripVariantContext';
import { useAuth } from '../../hooks/useAuth';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';

interface TripDetailHeaderProps {
  tripContext: any;
  showInbox: boolean;
  onToggleInbox: () => void;
  onShowInvite: () => void;
  onShowTripSettings: () => void;
  onShowAuth: () => void;
}

export const TripDetailHeader = ({
  tripContext,
  showInbox,
  onToggleInbox,
  onShowInvite,
  onShowTripSettings,
  onShowAuth
}: TripDetailHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { variant, accentColors } = useTripVariant();

  return (
    <div className="flex items-center justify-between mb-4">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
      >
        <div className={`bg-gray-800 p-2 rounded-lg shadow-lg group-hover:shadow-${accentColors.primary}/20 transition-all border border-gray-700 hover:border-${accentColors.primary}/50`}>
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Back to my trips</span>
      </button>

    </div>
  );
};
