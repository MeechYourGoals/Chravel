import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TripChannel, ChannelMessage } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { VirtualizedMessageContainer } from '@/features/chat/components/VirtualizedMessageContainer';
import { MessageItem } from '@/features/chat/components/MessageItem';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { InlineReplyComponent } from '@/features/chat/components/InlineReplyComponent';
import { useLinkPreviews } from '@/features/chat/hooks/useLinkPreviews';
import { useAuth } from '@/hooks/useAuth';
import { getMockAvatar } from '@/utils/mockAvatars';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { Button } from '@/components/ui/button';
import {
  mapChannelSendError,
  formatToastDescription,
  validateMessageContent,
} from '@/utils/channelErrors';
import {
  toggleMessageReaction,
  getMessagesReactions,
  subscribeToReactions,
  type ReactionType,
} from '@/services/chatService';
import { supabase } from '@/integrations/supabase/client';
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
  onBack: _onBack,
  onChannelChange,
}: ChannelChatViewProps) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<
    Record<string, Record<string, { count: number; userReacted: boolean; users: string[] }>>
  >({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { canPerformAction } = useRolePermissions(channel.tripId);
  const { leaveRole } = useRoleAssignments({ tripId: channel.tripId });

  const DEMO_TRIP_IDS = [
    'lakers-road-trip',
    'beyonce-cowboy-carter-tour',
    'eli-lilly-c-suite-retreat-2026',
  ];
  const isDemoChannel = DEMO_TRIP_IDS.includes(channel.tripId);

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

  // Handle opening a reply
  const handleOpenReply = useCallback(
    (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      setReplyingTo({
        id: msg.id,
        text: msg.content,
        senderName: msg.senderName,
      });
    },
    [messages],
  );

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Transform ChannelMessage to ChatMessage format for MessageItem
  const formattedMessages = useMemo(() => {
    return messages.map(msg => {
      const metadata = msg.metadata as Record<string, unknown> | null;
      const replyTo = metadata?.replyTo as { id: string; text: string; sender: string } | undefined;

      return {
        id: msg.id,
        text: msg.content,
        sender: {
          id: msg.senderId,
          name: msg.senderName,
          avatar: getMockAvatar(msg.senderName),
        },
        createdAt: msg.createdAt,
        isBroadcast: metadata?.isBroadcast || msg.messageType === 'system',
        isPayment: false,
        tags: [] as string[],
        replyTo: replyTo || undefined,
      };
    });
  }, [messages]);

  // Client-side link preview enrichment for channel messages
  const linkPreviews = useLinkPreviews(formattedMessages);

  // Merge link previews into formatted messages
  const messagesWithPreviews = useMemo(() => {
    return formattedMessages.map(msg => ({
      ...msg,
      linkPreview: linkPreviews[msg.id] || undefined,
    }));
  }, [formattedMessages, linkPreviews]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMessages depends on channel.id already in deps
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

    // Client-side validation
    const validationError = validateMessageContent(inputMessage);
    if (validationError) {
      toast({
        title: validationError.title,
        description: validationError.description,
        variant: 'destructive',
      });
      return;
    }

    // Guard: channel must be selected
    if (!channel?.id) {
      toast({
        title: 'No channel selected',
        description: 'Please select a channel before sending a message.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    // Check if this is a demo channel
    const DEMO_TRIP_IDS = [
      'lakers-road-trip',
      'beyonce-cowboy-carter-tour',
      'eli-lilly-c-suite-retreat-2026',
    ];
    if (DEMO_TRIP_IDS.includes(channel.tripId)) {
      // For demo channels, just add the message locally
      const demoMetadata: Record<string, unknown> = {};
      if (isBroadcast) demoMetadata.isBroadcast = true;
      if (replyingTo) {
        demoMetadata.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          sender: replyingTo.senderName,
        };
      }

      const newMsg: ChannelMessage = {
        id: `demo-msg-${Date.now()}`,
        channelId: channel.id,
        senderId: user?.id || 'demo-user',
        senderName: user?.displayName || 'You',
        content: inputMessage.trim(),
        messageType: isBroadcast ? 'system' : 'text',
        metadata: Object.keys(demoMetadata).length > 0 ? demoMetadata : undefined,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
      clearReply();
      setSending(false);
      return;
    }

    try {
      const replyMetadata = replyingTo
        ? {
            replyTo: {
              id: replyingTo.id,
              text: replyingTo.text,
              sender: replyingTo.senderName,
            },
          }
        : undefined;

      await channelService.sendMessage({
        channelId: channel.id,
        content: inputMessage.trim(),
        messageType: isBroadcast ? 'broadcast' : 'regular',
        metadata: replyMetadata,
      });
      setInputMessage('');
      clearReply();
    } catch (error) {
      console.error('[ChannelChatView] Send failed:', error);
      const mapped = mapChannelSendError(error);
      toast({
        title: mapped.title,
        description: formatToastDescription(mapped),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Load reactions for visible messages and subscribe to realtime updates
  useEffect(() => {
    if (!user?.id || isDemoChannel || messages.length === 0) return;

    const messageIds = messages.map(m => m.id);

    const loadReactions = async () => {
      const fetched = await getMessagesReactions(messageIds, user.id);
      const formatted: typeof reactions = {};
      for (const [msgId, typeMap] of Object.entries(fetched)) {
        formatted[msgId] = {};
        for (const [type, data] of Object.entries(typeMap)) {
          formatted[msgId][type] = {
            count: data.count,
            userReacted: data.userReacted,
            users: data.users || [],
          };
        }
      }
      setReactions(formatted);
    };

    loadReactions();

    const knownIds = new Set(messageIds);
    const reactionChannel = subscribeToReactions(
      channel.tripId,
      payload => {
        setReactions(prev => {
          const updated = { ...prev };
          if (!updated[payload.messageId]) {
            updated[payload.messageId] = {};
          }
          const current = updated[payload.messageId][payload.reactionType] || {
            count: 0,
            userReacted: false,
            users: [],
          };

          if (payload.eventType === 'INSERT') {
            updated[payload.messageId][payload.reactionType] = {
              count: current.count + 1,
              userReacted: payload.userId === user.id ? true : current.userReacted,
              users: Array.from(new Set([...current.users, payload.userId])),
            };
          } else if (payload.eventType === 'DELETE') {
            updated[payload.messageId][payload.reactionType] = {
              count: Math.max(0, current.count - 1),
              userReacted: payload.userId === user.id ? false : current.userReacted,
              users: current.users.filter(id => id !== payload.userId),
            };
          }

          return updated;
        });
      },
      knownIds,
    );

    return () => {
      supabase.removeChannel(reactionChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messages.length tracks when message list changes
  }, [user?.id, channel.id, channel.tripId, messages.length, isDemoChannel]);

  const handleReaction = useCallback(
    async (messageId: string, reactionType: string) => {
      if (!user?.id) return;

      if (isDemoChannel) {
        // Demo mode: local-only reactions
        setReactions(prev => {
          const updated = { ...prev };
          if (!updated[messageId]) updated[messageId] = {};
          const current = updated[messageId][reactionType] || {
            count: 0,
            userReacted: false,
            users: [],
          };
          const wasReacted = current.userReacted;
          updated[messageId][reactionType] = {
            count: wasReacted ? Math.max(0, current.count - 1) : current.count + 1,
            userReacted: !wasReacted,
            users: wasReacted
              ? current.users.filter(id => id !== user.id)
              : Array.from(new Set([...current.users, user.id])),
          };
          return updated;
        });
        return;
      }

      // Optimistic update
      setReactions(prev => {
        const updated = { ...prev };
        if (!updated[messageId]) updated[messageId] = {};
        const current = updated[messageId][reactionType] || {
          count: 0,
          userReacted: false,
          users: [],
        };
        const wasReacted = current.userReacted;
        updated[messageId][reactionType] = {
          count: wasReacted ? Math.max(0, current.count - 1) : current.count + 1,
          userReacted: !wasReacted,
          users: wasReacted
            ? current.users.filter(id => id !== user.id)
            : Array.from(new Set([...current.users, user.id])),
        };
        return updated;
      });

      // Persist to database
      const result = await toggleMessageReaction(messageId, user.id, reactionType as ReactionType);
      if (result.error) {
        // Revert on failure — refetch all reactions
        const messageIds = messages.map(m => m.id);
        const freshReactions = await getMessagesReactions(messageIds, user.id);
        const formatted: typeof reactions = {};
        for (const [msgId, typeMap] of Object.entries(freshReactions)) {
          formatted[msgId] = {};
          for (const [type, data] of Object.entries(typeMap)) {
            formatted[msgId][type] = {
              count: data.count,
              userReacted: data.userReacted,
              users: data.users || [],
            };
          }
        }
        setReactions(formatted);
      }
    },
    [user?.id, messages, isDemoChannel],
  );

  // Calculate member count from available channels, with direct DB fallback
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    // First try to get from available channels prop
    if (availableChannels && availableChannels.length > 0) {
      const currentChannel = availableChannels.find(c => c.id === channel.id);
      if (currentChannel?.memberCount && currentChannel.memberCount > 0) {
        setMemberCount(currentChannel.memberCount);
        return;
      }
    }

    // Fallback: query channel_members directly for an accurate count
    if (!channel?.id || isDemoChannel) return;

    const fetchMemberCount = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { count, error } = await supabase
          .from('channel_members')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id);

        if (!error && count !== null && count > 0) {
          setMemberCount(count);
        } else {
          // Also count role-based members via user_trip_roles + channel_role_access
          const { data: roleAccessData } = await supabase
            .from('channel_role_access')
            .select('role_id')
            .eq('channel_id', channel.id);

          if (roleAccessData && roleAccessData.length > 0) {
            const roleIds = roleAccessData.map(r => r.role_id);
            const { data: roleMembers } = await supabase
              .from('user_trip_roles')
              .select('user_id')
              .eq('trip_id', channel.tripId)
              .in('role_id', roleIds);

            if (roleMembers) {
              const uniqueUsers = new Set(roleMembers.map(r => r.user_id));
              setMemberCount(uniqueUsers.size);
            }
          }
        }
      } catch (err) {
        console.error('[ChannelChatView] Failed to fetch member count:', err);
      }
    };

    fetchMemberCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isDemoChannel derived from channel.tripId already in deps
  }, [channel?.id, channel?.tripId, availableChannels]);

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
            messages={messagesWithPreviews as any}
            renderMessage={(message: any) => (
              <MessageItem
                message={message}
                reactions={reactions[message.id]}
                onReaction={handleReaction}
                onReply={handleOpenReply}
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
        {replyingTo && (
          <InlineReplyComponent
            replyTo={{
              id: replyingTo.id,
              text: replyingTo.text,
              senderName: replyingTo.senderName,
            }}
            onCancel={clearReply}
          />
        )}
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
