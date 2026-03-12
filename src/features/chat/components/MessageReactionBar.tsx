import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

interface Reaction {
  id: string;
  emoji: string;
  label: string;
}

interface ReactionData {
  count: number;
  userReacted: boolean;
  users?: string[];
}

interface MessageReactionBarProps {
  messageId?: string;
  reactions?: Record<string, ReactionData>;
  onReaction?: (messageId: string, reactionType: string) => void;
  onReactMessage?: (reactionType: string) => void;
  className?: string;
  userNamesById?: Record<string, string>;
}

const REACTIONS: Reaction[] = [
  { id: 'like', emoji: '\u{1F44D}', label: 'Like' },
  { id: 'love', emoji: '\u2764\uFE0F', label: 'Love' },
  { id: 'laugh', emoji: '\u{1F602}', label: 'Haha' },
  { id: 'wow', emoji: '\u{1F62E}', label: 'Wow' },
  { id: 'sad', emoji: '\u{1F622}', label: 'Sad' },
  { id: 'angry', emoji: '\u{1F621}', label: 'Angry' },
  { id: 'clap', emoji: '\u{1F44F}', label: 'Clap' },
  { id: 'party', emoji: '\u{1F389}', label: 'Party' },
  { id: 'question', emoji: '\u2753', label: 'Question' },
  { id: 'dislike', emoji: '\u{1F44E}', label: 'Dislike' },
  { id: 'important', emoji: '\u2757', label: 'Important' },
];

export function getReactionTooltipText(
  users: string[] = [],
  userNamesById: Record<string, string> = {},
): string {
  if (users.length === 0) return '';
  return users.map(userId => userNamesById[userId] || 'Someone').join(', ');
}

export const MessageReactionBar: React.FC<MessageReactionBarProps> = ({
  messageId,
  reactions = {},
  onReaction,
  onReactMessage,
  className = '',
  userNamesById = {},
}) => {
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleReaction = (reactionId: string) => {
    setActiveReaction(reactionId);
    setTimeout(() => setActiveReaction(null), 300);

    if (onReaction && messageId) {
      onReaction(messageId, reactionId);
    } else if (onReactMessage) {
      onReactMessage(reactionId);
    }
  };

  const tooltipsByReaction = useMemo(() => {
    const result: Record<string, string> = {};
    for (const reaction of REACTIONS) {
      result[reaction.id] = getReactionTooltipText(reactions[reaction.id]?.users, userNamesById);
    }
    return result;
  }, [reactions, userNamesById]);

  const renderReactionButton = (reaction: Reaction, count: number, userReacted: boolean) => (
    <Button
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

  return (
    <TooltipProvider>
      <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
        {REACTIONS.map(reaction => {
          const reactionData = reactions[reaction.id];
          const count = reactionData?.count || 0;
          const userReacted = reactionData?.userReacted || false;
          const tooltipText = tooltipsByReaction[reaction.id];
          const hasTooltip = count > 0 && tooltipText;

          if (!hasTooltip) {
            return (
              <React.Fragment key={reaction.id}>
                {renderReactionButton(reaction, count, userReacted)}
              </React.Fragment>
            );
          }

          if (isMobile) {
            return (
              <Popover key={reaction.id}>
                <PopoverTrigger asChild>
                  {renderReactionButton(reaction, count, userReacted)}
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-auto max-w-[240px] px-3 py-1.5 text-xs break-words"
                >
                  {tooltipText}
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <Tooltip key={reaction.id}>
              <TooltipTrigger asChild>
                {renderReactionButton(reaction, count, userReacted)}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs break-words">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
