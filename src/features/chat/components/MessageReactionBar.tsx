import React from 'react';
import { Button } from '@/components/ui/button';

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
}

const REACTIONS: Reaction[] = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'dislike', emoji: '👎', label: 'Dislike' },
  { id: 'question', emoji: '❓', label: 'Question' },
];

export const MessageReactionBar: React.FC<MessageReactionBarProps> = ({
  messageId,
  reactions = {},
  onReaction,
  onReactMessage,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1 mt-1 ${className}`}>
      {REACTIONS.map(reaction => {
        const reactionData = reactions[reaction.id];
        const count = reactionData?.count || 0;
        const userReacted = reactionData?.userReacted || false;

        return (
          <Button
            key={reaction.id}
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onReaction && messageId) {
                onReaction(messageId, reaction.id);
              } else if (onReactMessage) {
                onReactMessage(reaction.id);
              }
            }}
            className={`h-6 px-2 py-1 text-xs rounded-full bg-background/20 backdrop-blur-sm border border-border/30 hover:bg-background/40 transition-all duration-200 ${
              userReacted
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={reaction.label}
          >
            <span className="text-sm mr-1">{reaction.emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </Button>
        );
      })}
    </div>
  );
};
