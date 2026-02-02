import { useState, useEffect, useCallback } from 'react';
import {
  roleChannelService,
  RoleChannel,
  RoleChannelMessage,
} from '../services/roleChannelService';
import { channelService } from '../services/channelService';
import { getDemoChannelsForTrip } from '../data/demoChannelData';
import { TripChannel, ChannelMessage } from '../types/roleChannels';
import { useDemoMode } from './useDemoMode';
import { MockRolesService } from '@/services/mockRolesService';

// All demo trip IDs including Pro and Event trips
const DEMO_TRIP_IDS = [
  // Pro trips
  'lakers-road-trip',
  'beyonce-cowboy-carter-tour',
  'eli-lilly-c-suite-retreat-2026',
  '13',
  '14',
  '15',
  '16',
  // Consumer demo trips (numeric IDs)
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

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
  updatedAt: channel.createdAt,
});

// Convert ChannelMessage to RoleChannelMessage
const convertToRoleChannelMessage = (msg: ChannelMessage): RoleChannelMessage => ({
  id: msg.id,
  channelId: msg.channelId,
  senderId: msg.senderId,
  senderName: msg.senderName,
  senderAvatar: undefined,
  content: msg.content,
  createdAt: msg.createdAt,
});

export const useRoleChannels = (tripId: string, userRole: string, roles?: string[]) => {
  const { isDemoMode } = useDemoMode();
  const [availableChannels, setAvailableChannels] = useState<TripChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<TripChannel | null>(null);
  const [messages, setMessages] = useState<RoleChannelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Map<string, ChannelMessage[]>>(new Map());

  const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);

  // Load channels for this trip
  const loadChannels = useCallback(async () => {
    setIsLoading(true);

    // DEMO MODE: Load from mock service
    if (isDemoMode || isDemoTrip) {
      // First try mock service (user-created channels)
      const mockChannels = MockRolesService.getChannelsForTrip(tripId);
      if (mockChannels && mockChannels.length > 0) {
        setAvailableChannels(mockChannels);
        setIsLoading(false);
        return;
      }

      // Fallback to demo channels with dynamic generation
      const { channels, messagesByChannel } = getDemoChannelsForTrip(tripId, roles);
      setAvailableChannels(channels);
      setDemoMessages(messagesByChannel);
      setIsLoading(false);
      return;
    }

    // AUTHENTICATED MODE: Fetch from database using proper role-based access check
    try {
      // Use channelService.getAccessibleChannels which properly checks user_trip_roles
      // and channel_role_access to return only channels the user has access to
      const accessibleChannels = await channelService.getAccessibleChannels(tripId);

      // If no channels found, user might not have a role yet - show empty state
      if (!accessibleChannels || accessibleChannels.length === 0) {
        setAvailableChannels([]);
        setIsLoading(false);
        return;
      }

      // Channels already come in TripChannel format from channelService
      setAvailableChannels(accessibleChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
      setAvailableChannels([]);
    }

    setIsLoading(false);
  }, [tripId, userRole, isDemoMode, isDemoTrip, roles]);

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
      // Use channelService for proper RLS enforcement
      const channelMessages = await channelService.getMessages(activeChannel.id);
      // Convert to RoleChannelMessage format
      const formattedMessages: RoleChannelMessage[] = channelMessages.map(msg => ({
        id: msg.id,
        channelId: msg.channelId,
        senderId: msg.senderId,
        senderName: msg.senderName || 'Unknown',
        senderAvatar: msg.senderAvatar,
        content: msg.content,
        createdAt: msg.createdAt,
      }));
      setMessages(formattedMessages);
    };

    loadMessages();

    // Subscribe to new messages using channelService
    const unsubscribe = channelService.subscribeToChannel(activeChannel.id, newMessage => {
      const formattedMessage: RoleChannelMessage = {
        id: newMessage.id,
        channelId: newMessage.channelId,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName || 'Unknown',
        content: newMessage.content,
        createdAt: newMessage.createdAt,
      };
      setMessages(prev => [...prev, formattedMessage]);
    });

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
        senderId: 'demo-user',
        senderName: 'You',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);
      return true;
    }

    // Use channelService which properly respects RLS policies
    // If user doesn't have channel access, RLS will block the insert
    const message = await channelService.sendMessage({
      channelId: activeChannel.id,
      content,
    });
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
    refreshChannels: loadChannels,
  };
};
