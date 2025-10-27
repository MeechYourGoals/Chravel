import React from 'react';
import { MessageSquare, Info } from 'lucide-react';
import { InlineChannelList } from '../channels/InlineChannelList';

interface ChannelsViewProps {
  tripId: string;
  userRole: string;
}

export const ChannelsView = ({ tripId, userRole }: ChannelsViewProps) => {
  // DEBUG: Log what ChannelsView receives
  console.log('[ChannelsView] Rendering with:', { tripId, userRole });

  return (
    <div className="space-y-6">
      {/* DEBUG PANEL - Remove after testing */}
      <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-4">
        <h3 className="text-green-300 font-bold mb-2">🔍 CHANNELS VIEW DEBUG</h3>
        <div className="text-xs text-green-200 space-y-1">
          <p><strong>ChannelsView Rendered:</strong> ✅</p>
          <p><strong>Trip ID:</strong> {tripId}</p>
          <p><strong>User Role:</strong> {userRole}</p>
          <p><strong>InlineChannelList will render below:</strong> ↓</p>
        </div>
      </div>

      {/* Header with Info */}
      <div className="bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="text-purple-400" size={24} />
          <h2 className="text-xl font-bold text-white">Role-Based Channels</h2>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300 space-y-1">
              <p className="font-medium">How channels work:</p>
              <ul className="text-xs text-blue-200 space-y-1 ml-4">
                <li>• Each channel is private to members with that role</li>
                <li>• Click any channel to view messages and participate</li>
                <li>• Main trip chat remains available to everyone</li>
                <li>• Perfect for focused discussions (e.g., security, medical, production)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="space-y-4">
        <InlineChannelList tripId={tripId} userRole={userRole} />
      </div>

      {/* Help Text for No Channels */}
      <div className="bg-white/5 border border-gray-700 rounded-lg p-4">
        <p className="text-xs text-gray-400">
          Don't see a channel you need? Contact an admin to create new role-based channels or assign you additional roles.
        </p>
      </div>
    </div>
  );
};
