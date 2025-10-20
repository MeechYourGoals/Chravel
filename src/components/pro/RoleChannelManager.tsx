import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { MessageSquare, Settings, Shield, Hash } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { TripChannel } from '../../types/roleChannels';
import { channelService } from '../../services/channelService';
import { useToast } from '../../hooks/use-toast';
import { ChannelSelector } from './channels/ChannelSelector';
import { ChannelChatView } from './channels/ChannelChatView';
import { AdminRoleManager } from './channels/AdminRoleManager';
import { getDemoChannelsForTrip } from '../../data/demoChannelData';

interface RoleChannelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  roster: ProParticipant[];
  userRole: string;
  existingRoles: string[];
}

export const RoleChannelManager = ({
  isOpen,
  onClose,
  tripId,
  roster,
  userRole,
  existingRoles
}: RoleChannelManagerProps) => {
  const [channels, setChannels] = useState<TripChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TripChannel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadChannels();
      checkAdminStatus();
    }
  }, [isOpen, tripId]);

  const checkAdminStatus = async () => {
    const adminStatus = await channelService.isAdmin(tripId);
    setIsAdmin(adminStatus);
  };

  const loadChannels = async () => {
    setLoading(true);
    if (demoMode) {
      // Load demo data
      const { channels: demoChannels } = getDemoChannelsForTrip(tripId);
      setChannels(demoChannels);
    } else {
      const accessibleChannels = await channelService.getAccessibleChannels(tripId);
      setChannels(accessibleChannels);
    }
    setLoading(false);
  };

  const enterDemoMode = () => {
    setDemoMode(true);
    setSelectedChannel(null);
    loadChannels();
  };

  const exitDemoMode = () => {
    setDemoMode(false);
    setSelectedChannel(null);
    loadChannels();
  };

  const handleChannelSelect = (channel: TripChannel) => {
    setSelectedChannel(channel);
  };

  const handleBackToList = () => {
    setSelectedChannel(null);
  };

  const handleAdminPanelClose = () => {
    setShowAdminPanel(false);
    loadChannels(); // Refresh channels after admin changes
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-red-400" />
                Role Channels
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowAdminPanel(true)}
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  <Shield size={14} className="mr-2" />
                  Admin Controls
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading channels...</div>
              </div>
            ) : selectedChannel ? (
              <ChannelChatView 
                channel={selectedChannel} 
                onBack={handleBackToList}
              />
            ) : (
              <div className="space-y-6">
                {/* Demo Mode Banner */}
                {demoMode && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-blue-400 text-sm">
                        <strong>Demo Mode:</strong> Viewing sample channels with mock messages
                      </p>
                      <Button
                        onClick={exitDemoMode}
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      >
                        Exit Demo
                      </Button>
                    </div>
                  </div>
                )}

                {/* Info Banner */}
                {!demoMode && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-red-400 text-sm">
                        <strong>Role-Based Channels:</strong> Private channels for specific team roles. 
                        Only members with assigned roles can access their channels.
                      </p>
                      {(tripId === '13' || tripId === '14') && (
                        <Button
                          onClick={enterDemoMode}
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/10 flex-shrink-0 ml-4"
                        >
                          View Demo
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Channel List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Hash size={18} />
                      Your Channels ({channels.length})
                    </h3>
                  </div>

                  <ChannelSelector
                    channels={channels}
                    selectedChannel={selectedChannel}
                    onSelectChannel={handleChannelSelect}
                  />
                </div>

                {/* How It Works */}
                <div className="bg-white/5 border border-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-white mb-2">How it works:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Main trip chat remains for everyone</li>
                    <li>• Role channels are private - only visible to members with that role</li>
                    <li>• Admins create custom roles and assign members</li>
                    <li>• Members can have multiple roles for multi-channel access</li>
                    <li>• Perfect for focused discussions (e.g., security, medical, production)</li>
                  </ul>
                </div>

                {!isAdmin && channels.length === 0 && (
                  <div className="text-center py-8 bg-white/5 rounded-lg border border-gray-700">
                    <MessageSquare size={48} className="text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No role channels assigned yet</p>
                    <p className="text-xs text-gray-500 mt-1">Contact an admin to assign you a role</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Role Manager Modal */}
      {showAdminPanel && (
        <AdminRoleManager
          isOpen={showAdminPanel}
          onClose={handleAdminPanelClose}
          tripId={tripId}
          roster={roster}
          onRolesUpdated={loadChannels}
        />
      )}
    </>
  );
};
