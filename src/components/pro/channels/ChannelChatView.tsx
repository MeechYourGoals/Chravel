import React, { useState, useEffect, useMemo } from 'react';
import { TripChannel, ChannelMessage } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { VirtualizedMessageContainer } from '@/features/chat/components/VirtualizedMessageContainer';
import { MessageItem } from '@/features/chat/components/MessageItem';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { useAuth } from '@/hooks/useAuth';
import { getMockAvatar } from '@/utils/mockAvatars';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Lock, LogOut, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChannelChatViewProps {
  channel: TripChannel;
  availableChannels?: TripChannel[];
  onBack?: () => void;
  onChannelChange?: (channel: TripChannel | null) => void;
}

export const ChannelChatView = ({
  channel,
  availableChannels = [],
  onBack,
  onChannelChange,
}: ChannelChatViewProps) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<
    Record<string, Record<string, { count: number; userReacted: boolean }>>
  >({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { canPerformAction, permissionLevel } = useRolePermissions(channel.tripId);
  const { leaveRole } = useRoleAssignments({ tripId: channel.tripId });

  // Handle user leaving the channel/role (self-service)
  const handleLeaveChannel = async () => {
    if (!user?.id || !channel.requiredRoleId) {
      toast({
        title: 'Cannot leave channel',
        description: 'Unable to determine your role assignment',
        variant: 'destructive',
      });
      return;
    }

    setIsLeaving(true);
    try {
      // Use leaveRole for self-service removal (no admin permission required)
      await leaveRole(channel.requiredRoleId);
      toast({
        title: 'Left channel',
        description: `You have left the "${channel.channelName}" channel`,
      });
      setShowLeaveConfirm(false);
      // Navigate back to main messages
      if (onChannelChange) {
        onChannelChange(null);
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
      toast({
        title: 'Failed to leave channel',
        description: 'An error occurred while leaving the channel',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
    }
  };

  // Transform ChannelMessage to ChatMessage format for MessageItem
  const formattedMessages = useMemo(() => {
    return messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      sender: {
        id: msg.senderId,
        name: msg.senderName,
        avatar: getMockAvatar(msg.senderName),
      },
      createdAt: msg.createdAt,
      isBroadcast: msg.metadata?.isBroadcast || msg.messageType === 'system',
      isPayment: false,
      tags: [] as string[],
    }));
  }, [messages]);

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time updates (skip for demo channels)
    const DEMO_TRIP_IDS = [
      'lakers-road-trip',
      'beyonce-cowboy-carter-tour',
      'eli-lilly-c-suite-retreat-2026',
    ];
    if (!DEMO_TRIP_IDS.includes(channel.tripId)) {
      const unsubscribe = channelService.subscribeToChannel(
        channel.id,
        newMsg => {
          setMessages(prev => [...prev, newMsg]);
        },
        deletedMessageId => {
          // Remove deleted message completely from the list
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
        },
      );
      return unsubscribe;
    }
  }, [channel.id, channel.tripId]);

  const loadMessages = async () => {
    setLoading(true);

    // Check if this is a demo channel
    const DEMO_TRIP_IDS = [
      'lakers-road-trip',
      'beyonce-cowboy-carter-tour',
      'eli-lilly-c-suite-retreat-2026',
    ];
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
    const DEMO_TRIP_IDS = [
      'lakers-road-trip',
      'beyonce-cowboy-carter-tour',
      'eli-lilly-c-suite-retreat-2026',
    ];
    if (DEMO_TRIP_IDS.includes(channel.tripId)) {
      // For demo channels, just add the message locally
      const newMsg: ChannelMessage = {
        id: `demo-msg-${Date.now()}`,
        channelId: channel.id,
        senderId: user?.id || 'demo-user',
        senderName: user?.displayName || 'You',
        content: inputMessage.trim(),
        messageType: isBroadcast ? 'system' : 'text',
        metadata: isBroadcast
          ? {
              isBroadcast: true,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
      setSending(false);
      return;
    }

    const sent = await channelService.sendMessage({
      channelId: channel.id,
      content: inputMessage.trim(),
      messageType: isBroadcast ? 'broadcast' : 'regular',
    });

    if (sent) {
      setInputMessage('');
    } else {
      toast({
        title: 'Failed to send message',
        variant: 'destructive',
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

    const currentReaction = updatedReactions[messageId][reactionType] || {
      count: 0,
      userReacted: false,
    };
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

  // Check if this is a demo channel (can't leave demo channels)
  const DEMO_TRIP_IDS = [
    'lakers-road-trip',
    'beyonce-cowboy-carter-tour',
    'eli-lilly-c-suite-retreat-2026',
  ];
  const isDemoChannel = DEMO_TRIP_IDS.includes(channel.tripId);

  return (
    <>
      {/* Channel Header with Options */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/80">
            #{channel.channelName.toLowerCase().replace(/\s+/g, '-')}
          </span>
          <span className="text-xs text-white/50">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Channel Options Dropdown */}
        {!isDemoChannel && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                <MoreVertical className="h-4 w-4 text-white/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
              <DropdownMenuItem
                onClick={() => setShowLeaveConfirm(true)}
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Reuse VirtualizedMessageContainer */}
      <div className="flex-1">
        {loading ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-gray-400 py-8">Loading messages...</div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={formattedMessages}
            renderMessage={message => (
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
      <div className="bg-black/30 p-3 pb-[env(safe-area-inset-bottom)] md:pb-3">
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
            safeAreaBottom={false}
            tripId={channel.tripId}
          />
        ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2 text-gray-400">
            <Lock size={16} />
            <span className="text-sm">You have view-only access to this channel</span>
          </div>
        )}
      </div>

      {/* Leave Channel Confirmation Dialog */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &quot;{channel.channelName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to leave this channel?</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>You will lose access to this channel and its messages</li>
                <li>
                  You will be removed from the &quot;
                  {channel.requiredRoleName || channel.channelName}&quot; role
                </li>
                <li>An admin will need to re-add you if you want to rejoin</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={isLeaving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChannel}
              disabled={isLeaving}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isLeaving ? 'Leaving...' : 'Leave Channel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
