import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Reaction {
  id: string;
  emoji: string;
  label: string;
}

interface MessageReactionBarProps {
  messageId?: string;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction?: (messageId: string, reactionType: string) => void;
  onReactMessage?: (reactionType: string) => void;
  className?: string;
  isPinned?: boolean; // New prop to show pinned state
}

const REACTIONS: Reaction[] = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Haha' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'question', emoji: '❓', label: 'Question' },
  { id: 'dislike', emoji: '👎', label: 'Dislike' },
];

export const MessageReactionBar: React.FC<MessageReactionBarProps> = ({
  messageId,
  reactions = {},
  onReaction,
  onReactMessage,
  className = '',
  isPinned = false,
}) => {
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const handleReaction = (reactionId: string) => {
    // Trigger animation state
    setActiveReaction(reactionId);
    setTimeout(() => setActiveReaction(null), 300);

    if (onReaction && messageId) {
      onReaction(messageId, reactionId);
    } else if (onReactMessage) {
      onReactMessage(reactionId);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
      {/* Pin Button - Separated as requested */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleReaction('pin')}
        className={`h-6 px-1.5 py-0.5 text-xs rounded-full border transition-all duration-200 relative overflow-hidden mr-1 ${
          isPinned
            ? 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
            : 'bg-background/20 border-border/30 text-muted-foreground hover:bg-background/40 hover:text-foreground'
        }`}
        title={isPinned ? 'Unpin message' : 'Pin message'}
      >
        <AnimatePresence>
          {activeReaction === 'pin' && (
            <motion.span
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              className="absolute inset-0 bg-current rounded-full"
            />
          )}
        </AnimatePresence>

        <motion.span
          className="text-sm"
          animate={activeReaction === 'pin' ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          📌
        </motion.span>
      </Button>

      {/* Vertical Separator */}
      <div className="w-px h-4 bg-border/50 mx-1" />

      {/* Standard Reactions */}
      {REACTIONS.map(reaction => {
        const reactionData = reactions[reaction.id];
        const count = reactionData?.count || 0;
        const userReacted = reactionData?.userReacted || false;

        return (
          <Button
            key={reaction.id}
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(reaction.id)}
            className={`h-6 px-1.5 py-0.5 text-xs rounded-full border transition-all duration-200 relative overflow-hidden ${
              userReacted
                ? 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
                : 'bg-background/20 border-border/30 text-muted-foreground hover:bg-background/40 hover:text-foreground'
            } ${count === 0 && !userReacted ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
            title={reaction.label}
          >
            <AnimatePresence>
              {activeReaction === reaction.id && (
                <motion.span
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ scale: 1, opacity: 0 }}
                  className="absolute inset-0 bg-current rounded-full"
                />
              )}
            </AnimatePresence>

            <motion.span
              className="text-sm mr-1"
              animate={activeReaction === reaction.id ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {reaction.emoji}
            </motion.span>

            {count > 0 && (
              <span className="text-[10px] font-medium min-w-[6px] text-center">{count}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
