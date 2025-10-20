import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Users, ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { TripChannel, ChannelMessage } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { format } from 'date-fns';

interface ChannelChatViewProps {
  channel: TripChannel;
  onBack?: () => void;
}

export const ChannelChatView = ({ channel, onBack }: ChannelChatViewProps) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates
    const unsubscribe = channelService.subscribeToChannel(
      channel.id,
      (newMsg) => {
        setMessages(prev => [...prev, newMsg]);
      }
    );

    return unsubscribe;
  }, [channel.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await channelService.getMessages(channel.id);
    setMessages(msgs);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const sent = await channelService.sendMessage({
      channelId: channel.id,
      content: newMessage.trim()
    });

    if (sent) {
      setNewMessage('');
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800">
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="lg:hidden"
          >
            <ArrowLeft size={18} />
          </Button>
        )}
        <div className="flex items-center gap-2 flex-1">
          {channel.isPrivate && <Lock size={16} className="text-purple-400" />}
          <div>
            <h3 className="font-semibold text-white">#{channel.channelSlug}</h3>
            <p className="text-xs text-gray-400">
              {channel.requiredRoleName} • {channel.memberCount || 0} members
            </p>
          </div>
        </div>
        <Users size={18} className="text-gray-400" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.messageType === 'system' ? 'justify-center' : ''
              }`}
            >
              {msg.messageType === 'system' ? (
                <div className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                  {msg.content}
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-semibold">
                      {msg.senderName?.[0] || 'U'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-white text-sm">
                        {msg.senderName || 'User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(msg.createdAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm break-words">
                      {msg.content}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message #${channel.channelSlug}...`}
            className="flex-1 bg-gray-900 border-gray-600 text-white"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="bg-red-600 hover:bg-red-700"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
