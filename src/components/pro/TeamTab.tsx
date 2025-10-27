import React, { useState } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { ChannelsView } from './team/ChannelsView';
import { RolesView } from './team/RolesView';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
}

type TeamSubTab = 'channels' | 'roles';

export const TeamTab = ({ roster, userRole, isReadOnly = false, category, tripId, onUpdateMemberRole }: TeamTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<TeamSubTab>('channels');

  // DEBUG: Log what TeamTab receives
  console.log('[TeamTab] Rendering with:', { 
    tripId, 
    userRole, 
    rosterCount: roster?.length, 
    category,
    activeSubTab 
  });

  return (
    <div className="space-y-6">
      {/* DEBUG PANEL - Remove after testing */}
      <div className="bg-blue-900/50 border-2 border-blue-500 rounded-lg p-4 mb-4">
        <h3 className="text-blue-300 font-bold mb-2">🔍 DEBUG INFO</h3>
        <div className="text-xs text-blue-200 space-y-1">
          <p><strong>TeamTab Rendered:</strong> ✅</p>
          <p><strong>Trip ID:</strong> {tripId || '❌ MISSING'}</p>
          <p><strong>Active Sub-Tab:</strong> {activeSubTab}</p>
          <p><strong>User Role:</strong> {userRole}</p>
          <p><strong>Roster Count:</strong> {roster?.length || 0}</p>
          <p><strong>Category:</strong> {category}</p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setActiveSubTab('channels')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all duration-200 ${
              activeSubTab === 'channels'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span>Channels</span>
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all duration-200 ${
              activeSubTab === 'roles'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            <span>Roles</span>
          </button>
        </div>
      </div>

      {/* Conditional Content Rendering */}
      {activeSubTab === 'channels' ? (
        tripId ? (
          <ChannelsView tripId={tripId} userRole={userRole} />
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
            <MessageSquare size={32} className="mx-auto mb-2 text-yellow-400" />
            <p className="text-yellow-400">Trip ID is required to display channels</p>
          </div>
        )
      ) : (
        <RolesView
          roster={roster}
          userRole={userRole}
          isReadOnly={isReadOnly}
          category={category}
          onUpdateMemberRole={onUpdateMemberRole}
        />
      )}
    </div>
  );
};