import { useState, useCallback } from 'react';
import { useChatMessageParser } from './useChatMessageParser';
import { getMockAvatar } from '../utils/mockAvatars';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id: string;
  text: string;
  sender: { id: string; name: string; avatar?: string };
  createdAt: string;
  isAiMessage?: boolean;
  isBroadcast?: boolean;
  isPayment?: boolean;
  reactions?: { [key: string]: string[] };
  replyTo?: { id: string; text: string; sender: string };
  tags?: string[];
}

export interface ReplyContext {
  id: string;
  text: string;
  senderName: string;
}

export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  splitCount: number;
  splitParticipants: string[];
  paymentMethods: string[];
}

export interface UseChatComposerOptions {
  tripId?: string;
  demoMode?: boolean;
  isEvent?: boolean;
}

export const useChatComposer = ({ tripId, demoMode = false, isEvent = false }: UseChatComposerOptions = {}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyContext | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'broadcasts' | 'channels'>('all');
  
  const { user } = useAuth();
  const { parseMessage } = useChatMessageParser();

  const createMessage = useCallback((
    content: string,
    options: {
      isBroadcast?: boolean;
      isPayment?: boolean;
      paymentData?: PaymentData;
    } = {}
  ): ChatMessage => {
    const messageId = `msg_${Date.now()}`;
    const { isBroadcast = false, isPayment = false, paymentData } = options;

    if (isPayment && paymentData) {
      const perPersonAmount = (paymentData.amount / paymentData.splitCount).toFixed(2);
      const preferredPaymentMethod = "Venmo: @yourvenmo"; // TODO: Fetch from user's payment methods

      return {
        id: messageId,
        text: `${paymentData.description} - ${paymentData.currency} ${paymentData.amount.toFixed(2)} (split ${paymentData.splitCount} ways) • Pay me $${perPersonAmount} via ${preferredPaymentMethod}`,
        sender: { id: user?.id || 'user1', name: 'You', avatar: user?.avatar || getMockAvatar('You') },
        createdAt: new Date().toISOString(),
        isBroadcast: false,
        isPayment: true,
        reactions: {},
        tags: ['payment'],
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          sender: replyingTo.senderName
        } : undefined
      };
    }

    return {
      id: messageId,
      text: content,
      sender: { id: user?.id || 'user1', name: 'You', avatar: user?.avatar || getMockAvatar('You') },
      createdAt: new Date().toISOString(),
      isBroadcast,
      reactions: {},
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        sender: replyingTo.senderName
      } : undefined
    };
  }, [replyingTo]);

  const sendMessage = useCallback(async (
    options: {
      isBroadcast?: boolean;
      isPayment?: boolean;
      paymentData?: PaymentData;
    } = {}
  ): Promise<ChatMessage | null> => {
    const { isPayment = false, paymentData } = options;

    // Prevent payment creation for events
    if (isEvent && isPayment) {
      console.warn('Payment messages are not allowed for events');
      return null;
    }

    if (!isPayment && inputMessage.trim() === '') return null;

    const message = createMessage(inputMessage, options);

    // Parse message for media and links (only if not in demo mode)
    if (!demoMode && tripId && !isPayment) {
      await parseMessage(message.id, inputMessage, tripId);
    }

    // Clear input and reply context
    setInputMessage('');
    setReplyingTo(null);

    return message;
  }, [inputMessage, createMessage, demoMode, tripId, parseMessage]);

  const setReply = useCallback((messageId: string, messageText: string, senderName: string) => {
    setReplyingTo({ id: messageId, text: messageText, senderName });
  }, []);

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const filterMessages = useCallback((messages: ChatMessage[]) => {
    if (messageFilter === 'all') return messages;
    if (messageFilter === 'broadcasts') return messages.filter(m => m.isBroadcast);
    return messages;
  }, [messageFilter]);

  return {
    // State
    inputMessage,
    replyingTo,
    messageFilter,
    
    // Actions
    setInputMessage,
    setMessageFilter,
    sendMessage,
    setReply,
    clearReply,
    filterMessages,
  };
};
