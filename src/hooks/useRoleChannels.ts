import { useState, useEffect, useCallback } from 'react';
import { roleChannelService, RoleChannel, RoleChannelMessage } from '../services/roleChannelService';
import { getDemoChannelsForTrip } from '../data/demoChannelData';
import { TripChannel, ChannelMessage } from '../types/roleChannels';

const DEMO_TRIP_IDS = ['lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026', '13', '14', '15', '16'];

// Convert RoleChannel to TripChannel
const convertToTripChannel = (channel: RoleChannel): TripChannel => ({
  id: channel.id,
  tripId: channel.tripId,
  channelName: channel.roleName,
  channelSlug: channel.roleName.toLowerCase().replace(/\s+/g, '-'),
  requiredRoleId: 'role-' + channel.id,
  requiredRoleName: channel.roleName,
  isPrivate: true,
  isArchived: false,
  memberCount: channel.memberCount || 0,
  createdBy: channel.createdBy,
  createdAt: channel.createdAt,
  updatedAt: channel.createdAt
});

// Convert ChannelMessage to RoleChannelMessage
const convertToRoleChannelMessage = (msg: ChannelMessage): RoleChannelMessage => ({
  id: msg.id,
  channelId: msg.channelId,
  senderId: msg.senderId,
  senderName: msg.senderName,
  senderAvatar: undefined,
  content: msg.content,
  createdAt: msg.createdAt
});

export const useRoleChannels = (tripId: string, userRole: string) => {
  const [availableChannels, setAvailableChannels] = useState<TripChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<TripChannel | null>(null);
  const [messages, setMessages] = useState<RoleChannelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Map<string, ChannelMessage[]>>(new Map());

  const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);

  // Load channels for this trip
  const loadChannels = useCallback(async () => {
    setIsLoading(true);

    if (isDemoTrip) {
      // Load demo channels (already in TripChannel format)
      const { channels, messagesByChannel } = getDemoChannelsForTrip(tripId);
      setAvailableChannels(channels);
      setDemoMessages(messagesByChannel);
      setIsLoading(false);
      return;
    }

    const channels = await roleChannelService.getRoleChannels(tripId);
    
    // Filter to only show channels user can access and convert to TripChannel
    const accessibleChannels = channels
      .filter(channel => roleChannelService.canUserAccessChannel(channel, userRole))
      .map(convertToTripChannel);
    
    setAvailableChannels(accessibleChannels);
    setIsLoading(false);
  }, [tripId, userRole, isDemoTrip]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }

    if (isDemoTrip) {
      // Load demo messages
      const channelMessages = demoMessages.get(activeChannel.id) || [];
      const roleChannelMessages = channelMessages.map(convertToRoleChannelMessage);
      setMessages(roleChannelMessages);
      return;
    }

    const loadMessages = async () => {
      const channelMessages = await roleChannelService.getChannelMessages(activeChannel.id);
      setMessages(channelMessages);
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = roleChannelService.subscribeToChannel(
      activeChannel.id,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      }
    );

    return unsubscribe;
  }, [activeChannel, isDemoTrip, demoMessages]);

  const createChannel = async (roleName: string): Promise<boolean> => {
    const channel = await roleChannelService.createRoleChannel(tripId, roleName);
    if (channel) {
      await loadChannels();
      return true;
    }
    return false;
  };

  const deleteChannel = async (channelId: string): Promise<boolean> => {
    const success = await roleChannelService.deleteChannel(channelId);
    if (success) {
      if (activeChannel?.id === channelId) {
        setActiveChannel(null);
      }
      await loadChannels();
      return true;
    }
    return false;
  };

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!activeChannel) return false;

    if (isDemoTrip) {
      // For demo trips, just add the message to the local state
      const newMessage: RoleChannelMessage = {
        id: `demo-msg-${Date.now()}`,
        channelId: activeChannel.id,
        senderId: 'current-user',
        senderName: 'You',
        content,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);
      return true;
    }

    const message = await roleChannelService.sendChannelMessage(activeChannel.id, content);
    return !!message;
  };

  return {
    availableChannels,
    activeChannel,
    messages,
    isLoading,
    setActiveChannel,
    createChannel,
    deleteChannel,
    sendMessage,
    refreshChannels: loadChannels
  };
};

