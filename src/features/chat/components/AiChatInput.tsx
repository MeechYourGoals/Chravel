import React from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AiChatInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  disabled?: boolean;
  usageStatus?: {
    status: 'ok' | 'warning' | 'limit_reached';
    message: string;
    color: string;
  };
  onUpgradeClick?: () => void;
}

export const AiChatInput = ({ 
  inputMessage, 
  onInputChange, 
  onSendMessage, 
  onKeyPress, 
  isTyping,
  disabled = false,
  usageStatus,
  onUpgradeClick
}: AiChatInputProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    } else {
      onKeyPress(e);
    }
  };

  const isLimitReached = usageStatus?.status === 'limit_reached';

  return (
    <div className="space-y-2">
      {/* Usage Status Badge */}
      {usageStatus && (
        <div className="flex items-center justify-between px-1">
          <Badge 
            variant={isLimitReached ? 'destructive' : usageStatus.status === 'warning' ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {usageStatus.message}
          </Badge>
          {isLimitReached && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Upgrade for unlimited
            </button>
          )}
        </div>
      )}

      <div className="chat-composer flex gap-3 items-end">
        <textarea
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLimitReached ? "Upgrade to continue chatting..." : "Ask me anything about travel..."}
          rows={2}
          disabled={disabled || isLimitReached}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 backdrop-blur-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSendMessage}
          disabled={!inputMessage.trim() || isTyping || disabled || isLimitReached}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white size-10 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
