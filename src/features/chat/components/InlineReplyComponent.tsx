import React from 'react';

interface ReplyData {
  id: string;
  text: string;
  senderName: string;
}

interface InlineReplyComponentProps {
  replyTo?: ReplyData;
  onRemoveReply?: () => void;
  onCancel?: () => void;
}

export const InlineReplyComponent: React.FC<InlineReplyComponentProps> = ({
  replyTo,
  onRemoveReply,
  onCancel,
}) => {
  if (!replyTo) return null;

  return (
    <div className="bg-background/50 border-l-2 border-primary p-2 mb-2 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Replying to {replyTo.senderName}</p>
          <p className="text-sm text-foreground/80 truncate">{replyTo.text}</p>
        </div>
        {(onRemoveReply || onCancel) && (
          <button
            onClick={onRemoveReply || onCancel}
            className="text-muted-foreground hover:text-foreground ml-2 transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
