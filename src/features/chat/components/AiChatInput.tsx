import React, { useEffect, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VoiceButton } from './VoiceButton';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';

interface AiChatInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void | Promise<void>;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  disabled?: boolean;
  usageStatus?: {
    status: 'ok' | 'warning' | 'limit_reached';
    message: string;
    color: string;
  };
  onUpgradeClick?: () => void;
  voiceState?: VoiceState;
  isVoiceEligible?: boolean;
  onVoiceToggle?: () => void;
  onVoiceUpgrade?: () => void;
  /** Multimodal: callback when user selects images */
  onImageAttach?: (files: File[]) => void;
  /** Multimodal: currently attached image previews */
  attachedImages?: File[];
  /** Multimodal: remove an attached image by index */
  onRemoveImage?: (index: number) => void;
  /** Whether image attach is enabled */
  showImageAttach?: boolean;
}

const DEFAULT_IMAGES: File[] = [];

export const AiChatInput = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isTyping,
  disabled = false,
  usageStatus,
  onUpgradeClick,
  voiceState = 'idle',
  isVoiceEligible = false,
  onVoiceToggle,
  onVoiceUpgrade,
  onImageAttach,
  attachedImages = DEFAULT_IMAGES,
  onRemoveImage,
  showImageAttach = false,
}: AiChatInputProps) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = attachedImages.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [attachedImages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void onSendMessage();
    } else {
      onKeyPress(e);
    }
  };

  const handleSendClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void onSendMessage();
  };

  const isLimitReached = usageStatus?.status === 'limit_reached';

  return (
    <div className="space-y-2">
      {/* Usage Status Badge */}
      {usageStatus && (
        <div className="flex items-center justify-between px-1">
          <Badge
            variant={
              isLimitReached
                ? 'destructive'
                : usageStatus.status === 'warning'
                  ? 'secondary'
                  : 'outline'
            }
            className="text-xs"
          >
            {usageStatus.message}
          </Badge>
          {isLimitReached && onUpgradeClick && (
            <button
              type="button"
              onClick={() => onUpgradeClick()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Upgrade for unlimited
            </button>
          )}
        </div>
      )}

      {/* Image Previews */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 px-1 overflow-x-auto">
          {attachedImages.map((file, idx) => (
            <div
              key={idx}
              className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10"
            >
              <img
                src={previewUrls[idx] ?? ''}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage?.(idx)}
                className="absolute top-0 right-0 bg-black/70 rounded-bl-lg p-0.5"
                aria-label="Remove image"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-composer flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
        {/* Microphone (left) — tap to start Gemini Live or Web Speech voice */}
        {onVoiceToggle && (
          <VoiceButton
            voiceState={voiceState}
            isEligible={isVoiceEligible}
            onToggle={onVoiceToggle}
            onUpgrade={onVoiceUpgrade}
          />
        )}

        {/* Input Textarea */}
        <textarea
          value={inputMessage}
          onChange={e => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLimitReached ? 'Upgrade to continue chatting...' : 'Ask me anything...'}
          rows={2}
          disabled={disabled || isLimitReached}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 backdrop-blur-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleSendClick}
          disabled={
            (!inputMessage.trim() && attachedImages.length === 0) ||
            isTyping ||
            disabled ||
            isLimitReached
          }
          aria-label="Send message"
          className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90 text-white size-11 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
