import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface SystemMessageBubbleProps {
  body: string;
  timestamp: string | Date;
  onClick?: () => void;
}

/**
 * Simple centered muted text for system messages
 * No icons, no emojis - just clean timeline text
 */
export const SystemMessageBubble: React.FC<SystemMessageBubbleProps> = ({
  body,
  timestamp,
  onClick,
}) => {
  const [showTimestamp, setShowTimestamp] = useState(false);

  const formatTimestamp = (ts: string | Date): string => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const isClickable = !!onClick;

  return (
    <div
      className="flex flex-col items-center py-2 px-4"
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
      onTouchStart={() => setShowTimestamp(true)}
    >
      <p
        className={`text-sm text-muted-foreground text-center max-w-[85%] ${
          isClickable ? 'cursor-pointer hover:text-muted-foreground/80' : ''
        }`}
        onClick={onClick}
      >
        {body}
      </p>
      <span
        className={`text-xs text-muted-foreground/50 mt-1 transition-opacity duration-200 ${
          showTimestamp ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {formatTimestamp(timestamp)}
      </span>
    </div>
  );
};
