/**
 * MessageActionSheet Component
 *
 * Cross-platform action menu for messages:
 * - Desktop: Shows on hover as inline action bar
 * - Mobile/PWA: Opens as bottom sheet on long-press
 *
 * Actions: Reply, Reactions (like, love, dislike, important), Edit, Delete
 */

import React, { useState, useCallback } from 'react';
import { Heart, ThumbsUp, ThumbsDown, AlertCircle, MessageSquareReply, Edit, Trash2, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLongPress } from '@/hooks/useLongPress';
import type { ReactionType } from '@/services/chatService';

export interface MessageActionSheetProps {
  messageId: string;
  messageContent: string;
  isOwnMessage: boolean;
  isDeleted?: boolean;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  replyCount?: number;
  onReaction: (messageId: string, reactionType: ReactionType) => void;
  onReply: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
  children: React.ReactNode;
}

const REACTIONS: Array<{ type: ReactionType; emoji: string; icon: React.ElementType; label: string }> = [
  { type: 'like', emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { type: 'love', emoji: '❤️', icon: Heart, label: 'Love' },
  { type: 'dislike', emoji: '👎', icon: ThumbsDown, label: 'Dislike' },
  { type: 'important', emoji: '❗', icon: AlertCircle, label: 'Important' },
];

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  messageId,
  messageContent,
  isOwnMessage,
  isDeleted = false,
  reactions = {},
  replyCount = 0,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  className,
  children,
}) => {
  const isMobile = useMobilePortrait();
  const [showSheet, setShowSheet] = useState(false);
  const [showHoverActions, setShowHoverActions] = useState(false);

  // Long-press handler for mobile
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (isMobile && !isDeleted) {
        setShowSheet(true);
      }
    },
    threshold: 500,
  });

  const handleReaction = useCallback(
    (type: ReactionType) => {
      onReaction(messageId, type);
      setShowSheet(false);
    },
    [messageId, onReaction]
  );

  const handleReply = useCallback(() => {
    onReply(messageId);
    setShowSheet(false);
  }, [messageId, onReply]);

  const handleEdit = useCallback(() => {
    onEdit?.(messageId);
    setShowSheet(false);
  }, [messageId, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(messageId);
    setShowSheet(false);
  }, [messageId, onDelete]);

  // Render reaction buttons
  const renderReactionButtons = (size: 'sm' | 'lg' = 'sm') => (
    <div className={cn('flex items-center', size === 'lg' ? 'gap-3 justify-center' : 'gap-1')}>
      {REACTIONS.map((reaction) => {
        const data = reactions[reaction.type];
        const isActive = data?.userReacted;
        return (
          <Button
            key={reaction.type}
            variant="ghost"
            size={size === 'lg' ? 'default' : 'sm'}
            onClick={() => handleReaction(reaction.type)}
            className={cn(
              'rounded-full transition-all',
              size === 'lg'
                ? 'h-14 w-14 flex-col gap-0.5'
                : 'h-7 px-2',
              isActive && 'bg-primary/20 text-primary'
            )}
            title={reaction.label}
          >
            <span className={size === 'lg' ? 'text-2xl' : 'text-base'}>{reaction.emoji}</span>
            {size === 'sm' && data?.count ? (
              <span className="text-xs ml-0.5">{data.count}</span>
            ) : null}
            {size === 'lg' && (
              <span className="text-[10px] text-muted-foreground">{reaction.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );

  // Desktop: Inline action bar on hover
  const renderDesktopActions = () => {
    if (isDeleted) return null;

    return (
      <div
        className={cn(
          'absolute -top-8 right-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/95 border border-border/50 shadow-md',
          'opacity-0 group-hover:opacity-100 transition-opacity z-10',
          showHoverActions && 'opacity-100'
        )}
      >
        {/* Reaction buttons */}
        {renderReactionButtons('sm')}

        {/* Reply button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReply}
          className="h-7 px-2"
          title="Reply"
        >
          <MessageSquareReply className="h-4 w-4" />
          {replyCount > 0 && <span className="text-xs ml-1">{replyCount}</span>}
        </Button>

        {/* More actions dropdown (for own messages) */}
        {isOwnMessage && (onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  // Mobile: Bottom sheet
  const renderMobileSheet = () => (
    <Sheet open={showSheet} onOpenChange={setShowSheet}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="sr-only">
          <SheetTitle>Message Actions</SheetTitle>
        </SheetHeader>

        {/* Message preview */}
        <div className="px-4 py-3 bg-muted/30 rounded-lg mb-4 max-h-24 overflow-hidden">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {messageContent}
          </p>
        </div>

        {/* Reactions */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 px-1">React</p>
          {renderReactionButtons('lg')}
        </div>

        {/* Actions */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base"
            onClick={handleReply}
          >
            <MessageSquareReply className="h-5 w-5 mr-3" />
            Reply in thread
            {replyCount > 0 && (
              <span className="ml-auto text-muted-foreground text-sm">
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </Button>

          {isOwnMessage && onEdit && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-base"
              onClick={handleEdit}
            >
              <Edit className="h-5 w-5 mr-3" />
              Edit message
            </Button>
          )}

          {isOwnMessage && onDelete && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-base text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-5 w-5 mr-3" />
              Delete message
            </Button>
          )}
        </div>

        {/* Cancel button */}
        <Button
          variant="ghost"
          className="w-full mt-4 h-12"
          onClick={() => setShowSheet(false)}
        >
          Cancel
        </Button>
      </SheetContent>
    </Sheet>
  );

  return (
    <div
      className={cn('relative group', className)}
      onMouseEnter={() => !isMobile && setShowHoverActions(true)}
      onMouseLeave={() => !isMobile && setShowHoverActions(false)}
      {...(isMobile ? longPressHandlers : {})}
    >
      {children}

      {/* Desktop hover actions */}
      {!isMobile && renderDesktopActions()}

      {/* Mobile action sheet */}
      {isMobile && renderMobileSheet()}

      {/* Keyboard accessibility: show actions on focus */}
      <div
        className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:-top-8 focus-within:right-0"
        onFocus={() => setShowHoverActions(true)}
        onBlur={() => setShowHoverActions(false)}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSheet(true)}
          className="text-xs"
        >
          Message actions
        </Button>
      </div>
    </div>
  );
};
