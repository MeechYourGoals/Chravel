import React, { useState } from 'react';
import { Pin, Image as ImageIcon } from 'lucide-react';
import { PinnedMessagesList } from './PinnedMessagesList';
import { usePinnedMessage } from '../hooks/usePinnedMessage';

interface PinnedMessageBannerProps {
  tripId: string;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({ tripId }) => {
  const { pinnedMessages, refetch } = usePinnedMessage(tripId);
  const [isListOpen, setIsListOpen] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latestPin = pinnedMessages[0];

  // Determine display content
  const hasMedia = !!latestPin.media_url;
  const displayText = latestPin.content || (hasMedia ? 'Media Attachment' : 'Pinned Message');

  return (
    <>
      <div
        className="bg-accent/20 border-b border-accent/20 px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors backdrop-blur-sm sticky top-0 z-10"
        onClick={() => setIsListOpen(true)}
      >
        <div className="bg-primary/20 p-1.5 rounded-full flex-shrink-0">
            <Pin className="h-3.5 w-3.5 text-primary fill-primary" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-primary truncate">
                {latestPin.author_name}
             </span>
             <span className="text-[10px] text-muted-foreground/70">
                Pinned
             </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-hidden">
             {hasMedia && <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
             <p className="text-sm text-foreground/90 truncate leading-tight">
                {displayText}
             </p>
          </div>
        </div>

        {pinnedMessages.length > 1 && (
          <span className="text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full flex-shrink-0">
            +{pinnedMessages.length - 1}
          </span>
        )}
      </div>

      <PinnedMessagesList
        isOpen={isListOpen}
        onClose={() => setIsListOpen(false)}
        messages={pinnedMessages}
        onUnpin={() => {
            // Refetch immediately on unpin action
            refetch();
        }}
      />
    </>
  );
};
