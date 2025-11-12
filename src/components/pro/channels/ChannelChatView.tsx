import React, { useState, useEffect, useMemo } from 'react';
import { TripChannel, ChannelMessage } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { VirtualizedMessageContainer } from '../../chat/VirtualizedMessageContainer';
import { MessageItem } from '../../chat/MessageItem';
import { ChatInput } from '../../chat/ChatInput';
import { useAuth } from '@/hooks/useAuth';
import { getMockAvatar } from '@/utils/mockAvatars';
import { ChannelSwitcher } from '../../chat/ChannelSwitcher';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Lock } from 'lucide-react';

interface ChannelChatViewProps {
  channel: TripChannel;
  availableChannels?: TripChannel[];
  onBack?: () => void;
  onChannelChange?: (channel: TripChannel | null) => void;
}

export const ChannelChatView = ({ channel, availableChannels = [], onBack, onChannelChange }: ChannelChatViewProps) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, Record<string, { count: number; userReacted: boolean }>>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const { canPerformAction, permissionLevel } = useRolePermissions(channel.tripId);

  // Transform ChannelMessage to ChatMessage format for MessageItem
  const formattedMessages = useMemo(() => {
    return messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      sender: {
        id: msg.senderId,
        name: msg.senderName,
        avatar: getMockAvatar(msg.senderName)
      },
      createdAt: msg.createdAt,
      isBroadcast: msg.metadata?.isBroadcast || msg.messageType === 'system',
      isPayment: false,
      tags: [] as string[]
    }));
  }, [messages]);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates (skip for demo channels)
    const DEMO_TRIP_IDS = ['lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026'];
    if (!DEMO_TRIP_IDS.includes(channel.tripId)) {
      const unsubscribe = channelService.subscribeToChannel(
        channel.id,
        (newMsg) => {
          setMessages(prev => [...prev, newMsg]);
        }
      );
      return unsubscribe;
    }
  }, [channel.id, channel.tripId]);

  const loadMessages = async () => {
    setLoading(true);
    
    // Check if this is a demo channel
    const DEMO_TRIP_IDS = ['lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026'];
    if (DEMO_TRIP_IDS.includes(channel.tripId)) {
      const { messagesByChannel } = getDemoChannelsForTrip(channel.tripId);
      const demoMessages = messagesByChannel.get(channel.id) || [];
      setMessages(demoMessages);
      setLoading(false);
      return;
    }
    
    const msgs = await channelService.getMessages(channel.id);
    setMessages(msgs);
    setLoading(false);
  };

  const handleSendMessage = async (isBroadcast = false) => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    
    // Check if this is a demo channel
    const DEMO_TRIP_IDS = ['lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026'];
    if (DEMO_TRIP_IDS.includes(channel.tripId)) {
      // For demo channels, just add the message locally
      const newMsg: ChannelMessage = {
        id: `demo-msg-${Date.now()}`,
        channelId: channel.id,
        senderId: user?.id || 'current-user',
        senderName: user?.displayName || 'You',
        content: inputMessage.trim(),
        messageType: isBroadcast ? 'system' : 'text',
        metadata: isBroadcast ? {
          isBroadcast: true
        } : undefined,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
      setSending(false);
      return;
    }

    const sent = await channelService.sendMessage({
      channelId: channel.id,
      content: inputMessage.trim(),
      messageType: isBroadcast ? 'broadcast' : 'regular'
    });

    if (sent) {
      setInputMessage('');
    } else {
      toast({
        title: 'Failed to send message',
        variant: 'destructive'
      });
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (messageId: string, reactionType: string) => {
    const updatedReactions = { ...reactions };
    if (!updatedReactions[messageId]) {
      updatedReactions[messageId] = {};
    }

    const currentReaction = updatedReactions[messageId][reactionType] || { count: 0, userReacted: false };
    currentReaction.userReacted = !currentReaction.userReacted;
    currentReaction.count += currentReaction.userReacted ? 1 : -1;

    updatedReactions[messageId][reactionType] = currentReaction;
    setReactions(updatedReactions);
  };

  // Calculate member count from available channels
  const memberCount = useMemo(() => {
    if (!channel?.id || !availableChannels || availableChannels.length === 0) return 0;

    const currentChannel = availableChannels.find(c => c.id === channel.id);
    return currentChannel?.memberCount ?? 0;
  }, [channel?.id, availableChannels]);

  return (
    <>
      {/* Channel Switcher Header */}
      {availableChannels && availableChannels.length > 1 && onChannelChange && (
        <div className="border-b border-white/10 bg-black/30 p-3">
          <ChannelSwitcher
            activeChannel={channel.id}
            roleChannels={availableChannels.map(ch => ({
              id: ch.id,
              roleName: ch.channelName,
              tripId: ch.tripId,
              createdAt: ch.createdAt,
              createdBy: ch.createdBy,
              memberCount: ch.memberCount ?? 0
            }))}
            onChannelChange={(channelId) => {
              if (channelId === 'main') return; // Ignore main chat selection
              const newChannel = availableChannels.find(ch => ch.id === channelId);
              if (newChannel && onChannelChange) {
                onChannelChange(newChannel);
              }
            }}
          />
        </div>
      )}

      {/* Reuse VirtualizedMessageContainer */}
      <div className="flex-1">
        {loading ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-gray-400 py-8">Loading messages...</div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={formattedMessages}
            renderMessage={(message) => (
              <MessageItem
                message={message}
                reactions={reactions[message.id]}
                onReaction={handleReaction}
              />
            )}
            onLoadMore={() => {}} // Add pagination later
            hasMore={false}
            isLoading={false}
            className="chat-scroll-container native-scroll px-3"
            autoScroll={true}
          />
        )}
      </div>

      {/* Reuse ChatInput with permission check */}
      <div className="bg-black/30 p-3 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-3">
        {canPerformAction('channels', 'can_post') ? (
          <ChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            apiKey=""
            isTyping={sending}
            tripMembers={[]}
            hidePayments={true}
            isInChannelMode={true}
            isPro={true}
            tripId={channel.tripId}
          />
        ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2 text-gray-400">
            <Lock size={16} />
            <span className="text-sm">You have view-only access to this channel</span>
          </div>
        )}
      </div>
    </>
  );
};
