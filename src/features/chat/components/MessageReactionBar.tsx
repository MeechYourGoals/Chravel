import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmojiMartPicker } from './EmojiMartPicker';

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

export const REACTIONS: Reaction[] = [
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

/** Lookup map: reaction type ID → emoji character (e.g. 'like' → '👍') */
export const REACTION_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  REACTIONS.map(r => [r.id, r.emoji]),
);

/** First 5 reactions shown in the compact hover pill */
const QUICK_REACTIONS = REACTIONS.slice(0, 5);

const EMOJI_TO_REACTION_ID: Record<string, string> = Object.fromEntries(
  REACTIONS.map(reaction => [reaction.emoji, reaction.id]),
);

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
  const [showFullPicker, setShowFullPicker] = useState(false);
  const isMobile = useIsMobile();

  const handleReaction = (reactionId: string) => {
    if (onReaction && messageId) {
      onReaction(messageId, reactionId);
    } else if (onReactMessage) {
      onReactMessage(reactionId);
    }
  };

  const handleFullPickerSelect = (emoji: { native?: string }) => {
    if (!emoji.native) return;
    const mappedReactionId = EMOJI_TO_REACTION_ID[emoji.native] ?? emoji.native;
    handleReaction(mappedReactionId);
    setShowFullPicker(false);
  };

  const tooltipsByReaction = useMemo(() => {
    const result: Record<string, string> = {};
    for (const reaction of QUICK_REACTIONS) {
      result[reaction.id] = getReactionTooltipText(reactions[reaction.id]?.users, userNamesById);
    }
    return result;
  }, [reactions, userNamesById]);

  const renderQuickReactionButton = (reaction: Reaction) => {
    const reactionData = reactions[reaction.id];
    const count = reactionData?.count || 0;
    const userReacted = reactionData?.userReacted || false;
    const tooltipText = tooltipsByReaction[reaction.id];
    const hasTooltip = count > 0 && tooltipText;

    const button = (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleReaction(reaction.id)}
        className={`h-7 min-w-7 px-1.5 rounded-full border border-white/15 text-sm transition-colors ${
          userReacted
            ? 'bg-primary/20 text-primary hover:bg-primary/30'
            : 'bg-transparent text-white/85 hover:bg-white/10'
        }`}
        title={reaction.label}
      >
        <span>{reaction.emoji}</span>
      </Button>
    );

    if (!hasTooltip || isMobile) {
      return <React.Fragment key={reaction.id}>{button}</React.Fragment>;
    }

    return (
      <Tooltip key={reaction.id}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs break-words">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={`inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/75 px-1.5 py-1 shadow-lg backdrop-blur-sm ${className}`}
      >
        {QUICK_REACTIONS.map(renderQuickReactionButton)}

        <Popover open={showFullPicker} onOpenChange={setShowFullPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full border border-white/15 bg-transparent text-white/90 hover:bg-white/10"
              aria-label="Open full emoji picker"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="p-0 w-auto border-0 bg-transparent shadow-none"
            onOpenAutoFocus={event => event.preventDefault()}
          >
            <EmojiMartPicker onEmojiSelect={handleFullPickerSelect} />
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};
