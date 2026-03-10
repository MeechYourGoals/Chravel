import React, { useEffect, useState } from 'react';
import { Send, X, CalendarPlus, Bookmark, ListChecks, Sparkles } from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { CTA_GRADIENT, CTA_INTERACTIVE, CTA_DISABLED, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';

interface AiChatInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void | Promise<void>;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  disabled?: boolean;
  /** Dictation state for waveform button */
  convoVoiceState?: VoiceState;
  /** Tap: toggle dictation on/off */
  onConvoToggle?: () => void;
  /** Whether voice features are available */
  isVoiceEligible?: boolean;
  /** Upgrade prompt for ineligible users */
  onVoiceUpgrade?: () => void;
  /** Multimodal: callback when user selects images */
  onImageAttach?: (files: File[]) => void;
  /** Multimodal: currently attached image previews */
  attachedImages?: File[];
  /** Multimodal: remove an attached image by index */
  onRemoveImage?: (index: number) => void;
  /** Whether image attach is enabled */
  showImageAttach?: boolean;
  /** Callback when a Smart Import quick action chip is tapped */
  onQuickAction?: (action: string) => void;
  /** Callback to toggle Gemini Live mode */
  onLiveToggle?: () => void;
  /** Whether Gemini Live is currently active */
  isLiveActive?: boolean;
  /** Whether user is eligible for Gemini Live */
  isLiveEligible?: boolean;
}

export const AiChatInput = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isTyping,
  disabled = false,
  convoVoiceState = 'idle',
  onConvoToggle,
  isVoiceEligible = false,
  onVoiceUpgrade,
  onImageAttach: _onImageAttach,
  attachedImages = [],
  onRemoveImage,
  showImageAttach: _showImageAttach = false,
  onQuickAction,
  onLiveToggle,
  isLiveActive = false,
  isLiveEligible = false,
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

  // Derived conversation active state (dictation only now)
  const isConvoActive =
    isVoiceEligible && convoVoiceState !== 'idle' && convoVoiceState !== 'error';

  // Dynamic placeholder based on active mode
  const getPlaceholder = () => {
    if (isConvoActive) return 'Listening\u2026';
    return '';
  };

  return (
    <div className="space-y-2">
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

      {/* Smart Import quick action chips — shown when images are attached */}
      {attachedImages.length > 0 && onQuickAction && (
        <div className="flex gap-2 px-1 overflow-x-auto">
          {[
            { key: 'add_to_calendar', label: 'Add to calendar', icon: CalendarPlus },
            { key: 'save_to_trip', label: 'Save to trip', icon: Bookmark },
            { key: 'create_tasks', label: 'Create tasks', icon: ListChecks },
          ].map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onQuickAction(chip.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors whitespace-nowrap"
            >
              <chip.icon size={12} />
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-composer flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
        {/* Waveform / Dictation button */}
        {onConvoToggle && (
          <VoiceButton
            voiceState={convoVoiceState}
            isEligible={isVoiceEligible}
            onToggle={onConvoToggle}
            onUpgrade={onVoiceUpgrade}
          />
        )}

        {/* Input container */}
        <div className="relative flex-1 min-w-0">
          <textarea
            value={inputMessage}
            onChange={e => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            rows={2}
            disabled={disabled}
            className={`w-full bg-white/5 border rounded-2xl px-4 py-3 ${isLiveEligible ? 'pr-20' : ''} text-white placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 backdrop-blur-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isConvoActive ? 'border-primary/30 bg-primary/5' : 'border-white/10'
            }`}
          />

          {/* Gemini Live button — inside the input */}
          {isLiveEligible && onLiveToggle && (
            <button
              type="button"
              onClick={onLiveToggle}
              className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-full flex items-center gap-1 transition-all duration-200 select-none touch-manipulation ${
                isLiveActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
              aria-label={isLiveActive ? 'Stop live voice' : 'Start live voice'}
            >
              <Sparkles size={14} />
              <span className="text-[10px] font-medium">Live</span>
            </button>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSendClick}
          disabled={(!inputMessage.trim() && attachedImages.length === 0) || isTyping || disabled}
          aria-label="Send message"
          className={`size-11 rounded-full flex items-center justify-center shrink-0 select-none touch-manipulation ${CTA_GRADIENT} ${CTA_INTERACTIVE} ${CTA_DISABLED}`}
        >
          <Send size={CTA_ICON_SIZE} />
        </button>
      </div>
    </div>
  );
};
