import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Users, ArrowLeft, Radio } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { TripChannel, ChannelMessage } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { format } from 'date-fns';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { ChannelHeaderDropdown } from './ChannelHeaderDropdown';

interface ChannelChatViewProps {
  channel: TripChannel;
  availableChannels?: TripChannel[];
  onBack?: () => void;
  onChannelChange?: (channel: TripChannel | null) => void;
}

export const ChannelChatView = ({ channel, availableChannels = [], onBack, onChannelChange }: ChannelChatViewProps) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageType, setMessageType] = useState<'regular' | 'broadcast'>('regular');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    
    // Check if this is a demo channel
    const DEMO_TRIP_IDS = ['lakers-road-trip', 'beyonce-cowboy-carter-tour', 'eli-lilly-c-suite-retreat-2026'];
    if (DEMO_TRIP_IDS.includes(channel.tripId)) {
      // For demo channels, just add the message locally
      const newMsg: ChannelMessage = {
        id: `demo-msg-${Date.now()}`,
        channelId: channel.id,
        senderId: 'current-user',
        senderName: 'You',
        content: newMessage.trim(),
        messageType: messageType === 'broadcast' ? 'system' : 'text',
        metadata: messageType === 'broadcast' ? {
          isBroadcast: true
        } : undefined,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setMessageType('regular');
      setSending(false);
      return;
    }

    const sent = await channelService.sendMessage({
      channelId: channel.id,
      content: newMessage.trim(),
      messageType: messageType
    });

    if (sent) {
      setNewMessage('');
      setMessageType('regular');
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
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 border-b border-gray-700 bg-gray-800">
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="p-1 md:p-2 h-auto"
          >
            <ArrowLeft size={18} />
          </Button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {availableChannels.length > 0 && onChannelChange ? (
            <ChannelHeaderDropdown
              currentChannel={channel}
              availableChannels={availableChannels}
              onChannelChange={onChannelChange}
            />
          ) : (
            <>
              {channel.isPrivate && <Lock size={16} className="text-purple-400 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm md:text-base truncate">#{channel.channelSlug}</h3>
                <p className="text-xs text-gray-400 truncate">
                  {channel.requiredRoleName} • {channel.memberCount || 0} members
                </p>
              </div>
            </>
          )}
        </div>
        <Users size={18} className="text-gray-400 flex-shrink-0" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Lock size={48} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isBroadcast = msg.metadata?.isBroadcast || msg.messageType === 'system';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.messageType === 'system' && !isBroadcast ? 'justify-center' : ''
                }`}
              >
                {msg.messageType === 'system' && !isBroadcast ? (
                  <div className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                    {msg.content}
                  </div>
                ) : (
                  <>
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        isBroadcast ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-red-500 to-red-700'
                      }`}>
                        {isBroadcast ? <Radio size={16} /> : (msg.senderName?.[0] || 'U')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-white text-sm">
                          {msg.senderName || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>
                      <p className={`text-sm break-words ${
                        isBroadcast
                          ? 'bg-orange-900/20 border-l-4 border-orange-500 pl-3 py-2 text-gray-200'
                          : 'text-gray-300'
                      }`}>
                        {msg.content}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 md:p-4 border-t border-gray-700 bg-gray-800 safe-bottom space-y-2">
        {/* Message Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setMessageType('regular')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              messageType === 'regular'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💬 Regular
          </button>
          <button
            onClick={() => setMessageType('broadcast')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              messageType === 'broadcast'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📢 Broadcast
          </button>
        </div>

        {/* Input Row */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={messageType === 'broadcast' 
              ? `📢 Broadcast to #${channel.channelSlug}...` 
              : `Message #${channel.channelSlug}...`}
            className="flex-1 bg-gray-900 border-gray-600 text-white text-sm md:text-base min-h-[44px]"
            disabled={sending}
            maxLength={messageType === 'broadcast' ? 140 : undefined}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`min-w-[44px] min-h-[44px] p-2 ${
              messageType === 'broadcast' 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Send size={18} />
          </Button>
        </div>
        {messageType === 'broadcast' && (
          <p className="text-xs text-gray-500">
            {newMessage.length}/140 characters
          </p>
        )}
      </div>
    </div>
  );
};
