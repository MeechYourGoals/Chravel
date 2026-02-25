import React, { useState } from 'react';
import { UserMinus, LogOut, MoreVertical, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface TripUser {
  id: string;
  name: string;
  avatar: string;
  role?: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface TripUserManagementProps {
  tripId: string;
  tripName: string;
  users: TripUser[];
  currentUserId: string;
  onUserRemoved: (userId: string) => void;
  onLeaveTrip: () => void;
}

export const TripUserManagement = ({
  tripId,
  tripName,
  users,
  currentUserId,
  onUserRemoved,
  onLeaveTrip,
}: TripUserManagementProps) => {
  const { user } = useAuth();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<TripUser | null>(null);
  const [showUserActions, setShowUserActions] = useState<string | null>(null);

  const currentUser = users.find(u => u.id === currentUserId);
  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin' || isOwner;

  const handleLeaveTrip = () => {
    onLeaveTrip();
    setShowLeaveConfirm(false);
  };

  const handleRemoveUser = (userToRemove: TripUser) => {
    onUserRemoved(userToRemove.id);
    setUserToRemove(null);
    setShowUserActions(null);
  };

  const canRemoveUser = (targetUser: TripUser) => {
    if (targetUser.id === currentUserId) return false;
    if (targetUser.role === 'owner') return false;
    if (isOwner) return true;
    if (isAdmin && targetUser.role !== 'admin') return true;
    return false;
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'admin':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Trip Members</h3>
            <p className="text-gray-400 text-sm">{users.length} people in this trip</p>
          </div>

          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Leave Trip</span>
          </button>
        </div>

        <div className="space-y-3">
          {users.map(tripUser => (
            <div
              key={tripUser.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={tripUser.avatar}
                  alt={tripUser.name}
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{tripUser.name}</span>
                    {tripUser.id === currentUserId && (
                      <span className="text-xs bg-glass-orange/20 text-glass-orange px-2 py-1 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {tripUser.role && (
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getRoleColor(tripUser.role)}`}
                      >
                        {tripUser.role}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Joined {new Date(tripUser.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {canRemoveUser(tripUser) && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowUserActions(showUserActions === tripUser.id ? null : tripUser.id)
                    }
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showUserActions === tripUser.id && (
                    <div className="absolute right-0 top-full mt-2 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-xl z-10 min-w-[180px]">
                      <button
                        onClick={() => setUserToRemove(tripUser)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <UserMinus size={16} />
                        Remove from trip
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave Trip Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold text-white">Leave Trip?</h3>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to leave "{tripName}"? You'll lose access to all trip
              information and won't receive updates.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTrip}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-colors"
              >
                Leave Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Confirmation Modal */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <UserMinus size={24} />
                <h3 className="text-xl font-bold text-white">Remove User?</h3>
              </div>
              <button
                onClick={() => setUserToRemove(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <img
                src={userToRemove.avatar}
                alt={userToRemove.name}
                className="w-10 h-10 rounded-full border-2 border-white/20"
              />
              <div>
                <span className="text-white font-medium">{userToRemove.name}</span>
                {userToRemove.role && (
                  <div
                    className={`text-xs px-2 py-1 rounded border mt-1 inline-block ${getRoleColor(userToRemove.role)}`}
                  >
                    {userToRemove.role}
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to remove {userToRemove.name} from "{tripName}"? They'll lose
              access to all trip information.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setUserToRemove(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveUser(userToRemove)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-colors"
              >
                Remove User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close user actions */}
      {showUserActions && (
        <div className="fixed inset-0 z-5" onClick={() => setShowUserActions(null)} />
      )}
    </>
  );
};
