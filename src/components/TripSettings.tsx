import React, { useState } from 'react';
import { Settings, Users, Shield, Trash2, X, ScrollText, Activity } from 'lucide-react';
import { TripUserManagement } from './TripUserManagement';
import { getConsistentAvatar } from '../utils/avatarUtils';
import { EventLogDrawer } from './trip/EventLogDrawer';
import { isConsumerTrip } from '@/utils/tripTierDetector';
import { TripActivitySettings } from './settings/TripActivitySettings';

interface TripUser {
  id: string;
  name: string;
  avatar: string;
  role?: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface TripSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  currentUserId: string;
}

const TRIP_CATEGORIES = [
  'Sports – Pro, Collegiate, Youth',
  'Tour – Music, Comedy, etc.',
  'Business Travel',
  'School Trip',
  'Content',
  'Other',
];

export const TripSettings = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  currentUserId,
}: TripSettingsProps) => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'general' | 'activity' | 'danger' | 'eventlog'
  >('users');
  const [tripCategory, setTripCategory] = useState('Business Travel');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const showEventLogTab = isConsumerTrip(tripId);

  // Mock users data - this would come from your backend
  const [users, setUsers] = useState<TripUser[]>([
    {
      id: '1',
      name: 'Emma Wilson',
      avatar: getConsistentAvatar('Emma Wilson'),
      role: 'owner',
      joinedAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Jake Thompson',
      avatar: getConsistentAvatar('Jake Thompson'),
      role: 'admin',
      joinedAt: '2024-01-16',
    },
    {
      id: '3',
      name: 'Sarah Chen',
      avatar: getConsistentAvatar('Sarah Chen'),
      role: 'member',
      joinedAt: '2024-01-18',
    },
    {
      id: '4',
      name: 'You',
      avatar: getConsistentAvatar('You'),
      role: 'member',
      joinedAt: '2024-01-20',
    },
  ]);

  if (!isOpen) return null;

  const handleUserRemoved = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const handleLeaveTrip = () => {
    onClose();
    // Navigate back to trips list or show confirmation
  };

  const handleCategoryChange = (category: string) => {
    if (category === 'Other') {
      setShowCustomInput(true);
      setTripCategory('');
    } else {
      setShowCustomInput(false);
      setTripCategory(category);
      setCustomCategory('');
    }
  };

  const handleSaveCategory = () => {
    const finalCategory = showCustomInput ? customCategory : tripCategory;
    // This would save to your backend
  };

  const tabs = [
    { id: 'users', label: 'Members', icon: Users },
    { id: 'general', label: 'General', icon: Settings },
    ...(showEventLogTab ? [{ id: 'activity', label: 'Activity', icon: Activity }] : []),
    ...(showEventLogTab ? [{ id: 'eventlog', label: 'Event Log', icon: ScrollText }] : []),
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white/5 backdrop-blur-md border-r border-white/10 p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Trip Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === tab.id
                      ? 'bg-glass-orange/20 text-glass-orange border border-glass-orange/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {activeTab === 'users' && (
              <TripUserManagement
                tripId={tripId}
                tripName={tripName}
                users={users}
                currentUserId={currentUserId}
                onUserRemoved={handleUserRemoved}
                onLeaveTrip={handleLeaveTrip}
              />
            )}

            {activeTab === 'general' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">General Settings</h3>

                {/* Trip Category Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Trip Category
                  </label>
                  <select
                    value={showCustomInput ? 'Other' : tripCategory}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 focus:border-glass-orange/50"
                  >
                    {TRIP_CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  {showCustomInput && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Enter custom category..."
                        className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 focus:border-glass-orange/50"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleSaveCategory}
                    className="mt-3 bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-2 rounded-xl transition-colors font-medium"
                  >
                    Save Category
                  </button>
                </div>

                {/* Trip Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Trip Name</label>
                  <input
                    type="text"
                    defaultValue={tripName}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 focus:border-glass-orange/50"
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your trip..."
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 focus:border-glass-orange/50 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'activity' && showEventLogTab && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <TripActivitySettings tripId={tripId} />
              </div>
            )}

            {activeTab === 'eventlog' && showEventLogTab && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Event Log</h3>
                <p className="text-gray-400 mb-6">View system events and activity for this trip.</p>
                <button
                  onClick={() => setShowEventLog(true)}
                  className="bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-3 rounded-xl transition-colors"
                >
                  Open Event Log
                </button>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="bg-white/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-red-300 mb-4">Danger Zone</h3>
                <p className="text-gray-400 mb-6">These actions are irreversible.</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-colors">
                  Delete Trip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Log Drawer */}
      <EventLogDrawer
        isOpen={showEventLog}
        onClose={() => setShowEventLog(false)}
        tripId={tripId}
      />
    </div>
  );
};
