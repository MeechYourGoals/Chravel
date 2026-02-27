/**
 * ThreadView Component
 *
 * Displays threaded replies for a message in an iMessage-style inline view.
 * Supports realtime updates and reply submission.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';
import { defaultAvatar } from '@/utils/mockAvatars';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  getThreadReplies,
  sendThreadReply,
  subscribeToThreadReplies,
} from '@/services/chatService';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MessageRow = Database['public']['Tables']['trip_chat_messages']['Row'];

export interface ThreadViewProps {
  parentMessage: {
    id: string;
    content: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    tripId: string;
  };
  onClose: () => void;
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>;
}

interface ThreadReply {
  id: string;
  content: string;
  authorName: string;
  authorId?: string;
  authorAvatar?: string;
  createdAt: string;
  isEdited?: boolean;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  parentMessage,
  onClose,
  tripMembers = [],
}) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Load initial replies
  useEffect(() => {
    const loadReplies = async () => {
      setIsLoading(true);
      const data = await getThreadReplies(parentMessage.id);
      const formatted = data.map(row => formatReply(row, tripMembers));
      setReplies(formatted);
      setIsLoading(false);
    };

    loadReplies();
  }, [parentMessage.id, tripMembers]);

  // Subscribe to realtime thread updates
  useEffect(() => {
    const channel = subscribeToThreadReplies(parentMessage.id, row => {
      setReplies(prev => {
        if (prev.some(r => r.id === row.id)) return prev;
        return [...prev, formatReply(row, tripMembers)];
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage.id, tripMembers]);

  // Scroll to bottom when new replies come in
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const formatReply = (
    row: MessageRow,
    members: Array<{ id: string; name: string; avatar?: string }>,
  ): ThreadReply => {
    const member = members.find(m => m.id === row.user_id);
    return {
      id: row.id,
      content: row.content,
      authorName: member?.name || row.author_name,
      authorId: row.user_id || undefined,
      authorAvatar: member?.avatar,
      createdAt: row.created_at,
      isEdited: row.is_edited || false,
    };
  };

  const handleSendReply = useCallback(async () => {
    if (!replyContent.trim() || isSending) return;

    setIsSending(true);
    const authorName = user?.displayName || user?.email?.split('@')[0] || 'You';

    try {
      await sendThreadReply(parentMessage.id, {
        trip_id: parentMessage.tripId,
        author_name: authorName,
        content: replyContent.trim(),
        user_id: user?.id,
      });
      setReplyContent('');
    } catch (error) {
      console.error('[ThreadView] Failed to send reply:', error);
    } finally {
      setIsSending(false);
    }
  }, [replyContent, isSending, parentMessage, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwnMessage = (authorId?: string) => {
    return authorId === user?.id;
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Thread</span>
          <span className="text-xs text-muted-foreground">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
        <div className="flex gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={parentMessage.authorAvatar || defaultAvatar} />
            <AvatarFallback>{getInitials(parentMessage.authorName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{parentMessage.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatTime(parentMessage.createdAt)}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map(reply => (
            <div
              key={reply.id}
              className={cn('flex gap-2', isOwnMessage(reply.authorId) && 'flex-row-reverse')}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={reply.authorAvatar || defaultAvatar} />
                <AvatarFallback className="text-xs">{getInitials(reply.authorName)}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-1.5',
                  isOwnMessage(reply.authorId) ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {!isOwnMessage(reply.authorId) && (
                  <span className="text-xs font-medium opacity-70 block mb-0.5">
                    {reply.authorName}
                  </span>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                <span className="text-[10px] opacity-60 mt-0.5 block">
                  {formatTime(reply.createdAt)}
                  {reply.isEdited && ' (edited)'}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
        <div className="flex items-end gap-2">
          <Textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to thread..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={isSending}
          />
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyContent.trim() || isSending}
            className="h-[44px] px-4"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
