import { useState, useEffect, useCallback } from 'react';
import { RoleChannelMessage } from '../services/roleChannelService';
import { getDemoChannelsForTrip } from '../data/demoChannelData';
import { TripChannel, ChannelMessage } from '../types/roleChannels';
import { useDemoMode } from './useDemoMode';
import { MockRolesService } from '@/services/mockRolesService';
import { channelService } from '@/services/channelService';
import { supabase } from '@/integrations/supabase/client';

// All demo trip IDs including Pro and Event trips
const DEMO_TRIP_IDS = [
  // Pro trips
  'lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026',
  '13', '14', '15', '16',
  // Consumer demo trips (numeric IDs)
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

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

export const useRoleChannels = (tripId: string, _userRole: string, roles?: string[]) => {
  const { isDemoMode } = useDemoMode();
  const [availableChannels, setAvailableChannels] = useState<TripChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<TripChannel | null>(null);
  const [messages, setMessages] = useState<RoleChannelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Map<string, ChannelMessage[]>>(new Map());

  const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);

  // Load channels for this trip
  const loadChannels = useCallback(async () => {
    if (!tripId) {
      setAvailableChannels([]);
      setActiveChannel(null);
      return;
    }
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

    // AUTHENTICATED MODE: Fetch from database
    try {
      // ✅ Channels list must be derived from role membership (Slack-style)
      const accessibleChannels = await channelService.getAccessibleChannels(tripId);
      setAvailableChannels(accessibleChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
      setAvailableChannels([]);
    }
    
    setIsLoading(false);
  }, [tripId, isDemoMode, isDemoTrip, roles]);

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
      const channelMessages = await channelService.getMessages(activeChannel.id);
      const roleChannelMessages = channelMessages.map(convertToRoleChannelMessage);
      setMessages(roleChannelMessages);
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = channelService.subscribeToChannel(
      activeChannel.id,
      (newMessage) => {
        setMessages(prev => [...prev, convertToRoleChannelMessage(newMessage)]);
      }
    );

    return unsubscribe;
  }, [activeChannel, isDemoTrip, demoMessages]);

  // ✅ Realtime: when role assignments or channels change, recompute accessible channels
  useEffect(() => {
    if (!tripId || isDemoMode || isDemoTrip) return;

    const ch = supabase
      .channel(`role-channels:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_trip_roles', filter: `trip_id=eq.${tripId}` },
        () => { loadChannels(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_channels', filter: `trip_id=eq.${tripId}` },
        () => { loadChannels(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId, isDemoMode, isDemoTrip, loadChannels]);

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

