import React from 'react';
import { Users, Circle } from 'lucide-react';
import { useTripPresence } from '@/hooks/useTripPresence';

interface PresenceIndicatorProps {
  tripId: string;
  userId?: string;
  currentPage?: string;
  showAvatars?: boolean;
  maxAvatars?: number;
}

/**
 * PresenceIndicator Component
 *
 * Displays real-time presence of users viewing/editing a trip.
 * Shows avatars and count of active users.
 *
 * Features:
 * - Real-time updates via useTripPresence hook
 * - Avatar display with overflow count
 * - Mobile-responsive design
 * - Click to expand full list
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  tripId,
  userId,
  currentPage,
  showAvatars = true,
  maxAvatars = 3,
}) => {
  const { activeUsers, activeUserCount, isOnline } = useTripPresence(tripId, userId, currentPage);

  // Filter out current user
  const otherUsers = activeUsers.filter(u => u.userId !== userId);

  if (!isOnline || otherUsers.length === 0) {
    return null;
  }

  const displayUsers = otherUsers.slice(0, maxAvatars);
  const remainingCount = otherUsers.length - maxAvatars;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-600 rounded-lg">
      {showAvatars && (
        <div className="flex -space-x-2">
          {displayUsers.map(user => (
            <div key={user.userId} className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full border-2 border-gray-800 object-cover"
                  title={user.displayName}
                />
              ) : (
                <div
                  className="h-6 w-6 rounded-full border-2 border-gray-800 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold"
                  title={user.displayName}
                >
                  {user.displayName[0].toUpperCase()}
                </div>
              )}
              <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 text-green-400 fill-green-400" />
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="h-6 w-6 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
              +{remainingCount}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-gray-300 text-sm">
        <Users className="h-4 w-4" />
        <span>
          {activeUserCount === 1 ? '1 person viewing' : `${activeUserCount} people viewing`}
        </span>
      </div>
    </div>
  );
};
