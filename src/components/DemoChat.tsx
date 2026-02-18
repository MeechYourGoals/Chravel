import React, { useState, useMemo, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageItem } from '@/features/chat/components/MessageItem';
import { VirtualizedMessageContainer } from '@/features/chat/components/VirtualizedMessageContainer';
import { useTripChat } from '@/features/chat/hooks/useTripChat';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { ChatMessage } from '@/features/chat/hooks/useChatComposer';
import { useShareAsset } from '@/hooks/useShareAsset';
import { useAuth } from '@/hooks/useAuth';
import { toggleMessageReaction, getMessagesReactions, subscribeToReactions } from '@/services/chatService';
import { supabase } from '@/integrations/supabase/client';
import { useTripMembers } from '@/hooks/useTripMembers';
import { defaultAvatar } from '@/utils/mockAvatars';

interface DemoChatProps {
  tripId: string;
}

export const DemoChat = ({ tripId }: DemoChatProps) => {
  const { user } = useAuth();
  const { tripMembers } = useTripMembers(tripId);
  const {
    messages: liveMessages,
    sendMessageAsync: sendTripMessage,
    loadMore,
    hasMore,
    isLoadingMore,
    isCreating: isSendingMessage,
  } = useTripChat(tripId);
  const [inputValue, setInputValue] = useState('');
  const [reactions, setReactions] = useState<
    Record<string, Record<string, { count: number; userReacted: boolean }>>
  >({});
  const [isTyping, setIsTyping] = useState(false);

  const { shareMultipleFiles } = useShareAsset(tripId);

  const handleSendMessage = useCallback(
    async (
      isBroadcast?: boolean,
      _isPayment?: boolean,
      _paymentData?: unknown,
      _linkPreview?: unknown,
      _mentionedUserIds?: string[],
    ) => {
      if (!inputValue.trim()) return;
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'You';
      const messageType = isBroadcast ? 'broadcast' : 'text';
      try {
        await sendTripMessage(inputValue, authorName, undefined, undefined, user?.id, 'standard', messageType);
        setInputValue('');
      } catch {
        // Toast from useTripChat
      }
    },
    [inputValue, sendTripMessage, user?.id, user?.displayName, user?.email],
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList, type: 'image' | 'video' | 'document') => {
      try {
        await shareMultipleFiles(files, type);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('File upload failed:', error);
        }
      }
    },
    [shareMultipleFiles],
  );

  const handleReaction = useCallback(
    async (messageId: string, reactionType: string) => {
      if (!user?.id) return;
      setReactions((prev) => {
        const updated = { ...prev };
        if (!updated[messageId]) updated[messageId] = {};
        const current = updated[messageId][reactionType] || { count: 0, userReacted: false };
        updated[messageId][reactionType] = {
          count: current.userReacted ? Math.max(0, current.count - 1) : current.count + 1,
          userReacted: !current.userReacted,
        };
        return updated;
      });
      const result = await toggleMessageReaction(messageId, user.id, reactionType as 'like' | 'love' | 'laugh');
      if (result.error) {
        const messageIds = liveMessages.map((m) => m.id);
        const fresh = await getMessagesReactions(messageIds, user.id);
        const formatted: Record<string, Record<string, { count: number; userReacted: boolean }>> = {};
        for (const [msgId, typeMap] of Object.entries(fresh)) {
          formatted[msgId] = {};
          for (const [type, data] of Object.entries(typeMap)) {
            formatted[msgId][type] = { count: data.count, userReacted: data.userReacted };
          }
        }
        setReactions(formatted);
      }
    },
    [user?.id, liveMessages],
  );

  React.useEffect(() => {
    if (!user?.id || liveMessages.length === 0) return;
    const fetchReactions = async () => {
      const messageIds = liveMessages.map((m) => m.id);
      const data = await getMessagesReactions(messageIds, user.id);
      const formatted: Record<string, Record<string, { count: number; userReacted: boolean }>> = {};
      for (const [msgId, typeMap] of Object.entries(data)) {
        formatted[msgId] = {};
        for (const [type, rData] of Object.entries(typeMap)) {
          formatted[msgId][type] = { count: rData.count, userReacted: rData.userReacted };
        }
      }
      setReactions(formatted);
    };
    fetchReactions();
  }, [liveMessages.length, user?.id]);

  React.useEffect(() => {
    if (!tripId || !user?.id) return;
    const messageIdSet = new Set(liveMessages.map((m) => m.id));
    const channel = subscribeToReactions(tripId, (payload) => {
      if (!messageIdSet.has(payload.messageId)) return;
      setReactions((prev) => {
        const updated = { ...prev };
        if (!updated[payload.messageId]) updated[payload.messageId] = {};
        const current = updated[payload.messageId][payload.reactionType] || { count: 0, userReacted: false };
        if (payload.eventType === 'INSERT') {
          updated[payload.messageId][payload.reactionType] = {
            count: current.count + 1,
            userReacted: payload.userId === user.id ? true : current.userReacted,
          };
        } else if (payload.eventType === 'DELETE') {
          updated[payload.messageId][payload.reactionType] = {
            count: Math.max(0, current.count - 1),
            userReacted: payload.userId === user.id ? false : current.userReacted,
          };
        }
        return updated;
      });
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, user?.id, liveMessages]);

  const transformedMessages = useMemo((): ChatMessage[] => {
    return liveMessages.map((msg) => {
      const member = tripMembers.find((m) => m.id === msg.user_id);
      return {
        id: msg.id,
        text: msg.content,
        sender: {
          id: msg.user_id || msg.author_name || 'system',
          name: member?.name ?? msg.author_name ?? 'System',
          avatar: member?.avatar ?? defaultAvatar,
        },
        createdAt: msg.created_at,
        isBroadcast: msg.message_type === 'broadcast',
        isPayment: msg.message_type === 'payment',
        isEdited: msg.is_edited,
        tags: msg.message_type === 'system' ? ['system'] : [],
      };
    });
  }, [liveMessages, tripMembers]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} className="text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Trip Chat</h3>
            <p className="text-gray-400 text-sm">
              Demo mode - Mock conversation
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md">DEMO</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-xl overflow-hidden flex flex-col" style={{ height: '500px' }}>
        {transformedMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <MessageCircle size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={transformedMessages}
            renderMessage={(message) => (
              <MessageItem
                key={message.id}
                message={message}
                reactions={reactions[message.id]}
                onReaction={handleReaction}
              />
            )}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            initialVisibleCount={10}
          />
        )}

        <div className="border-t border-gray-700">
          <ChatInput
            inputMessage={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            onFileUpload={handleFileUpload}
            apiKey=""
            isTyping={isSendingMessage}
            tripId={tripId}
            onTypingChange={setIsTyping}
            hidePayments={true}
            isInChannelMode={false}
            isPro={false}
          />
          <p className="text-xs text-gray-500 px-4 pb-2">
            Demo mode: Share photos, videos, and links just like in WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};
