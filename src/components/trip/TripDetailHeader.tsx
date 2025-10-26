
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Settings, UserPlus, Crown, FileDown } from 'lucide-react';

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
  onShowExport?: () => void;
}

export const TripDetailHeader = ({
  tripContext,
  showInbox,
  onToggleInbox,
  onShowInvite,
  onShowTripSettings,
  onShowAuth,
  onShowExport
}: TripDetailHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPlus, tier } = useConsumerSubscription();
  const { variant, accentColors } = useTripVariant();

  // Show export button for explorer tier and above (or Plus subscribers)
  const canExport = isPlus || tier === 'explorer';

  return (
    <div className="flex items-center justify-between mb-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
      >
        <div className={`bg-gray-800 p-2 rounded-lg shadow-lg group-hover:shadow-${accentColors.primary}/20 transition-all border border-gray-700 hover:border-${accentColors.primary}/50`}>
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Back to My Places</span>
      </button>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <button
              onClick={onShowInvite}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Invite</span>
            </button>

            <button
              onClick={onToggleInbox}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">{showInbox ? 'Hide Inbox' : 'Messages'}</span>
            </button>

            {canExport && onShowExport && (
              <button
                onClick={onShowExport}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                title="Export Trip Summary"
              >
                <FileDown size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            <button
              onClick={onShowTripSettings}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-xl transition-colors"
            >
              <Settings size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
