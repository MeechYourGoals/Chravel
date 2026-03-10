import React, { useEffect, useState } from 'react';
import { Send, X, CalendarPlus, Bookmark, ListChecks, Sparkles, Loader2 } from 'lucide-react';
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
  /** Whether Gemini Live is in a connecting/loading state */
  isLiveConnecting?: boolean;
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
  isLiveConnecting = false,
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
    if (isLiveActive) return 'Live conversation active\u2026';
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

      <div className="chat-composer flex flex-nowrap items-end gap-2 sm:gap-3 min-w-0">
        {/* Left voice control stack: Live button (top) + Waveform/Dictation (bottom) */}
        {onConvoToggle && (
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            {/* Gemini Live button — stacked above waveform */}
            {isLiveEligible && onLiveToggle && (
              <button
                type="button"
                onClick={onLiveToggle}
                className={`relative h-8 px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 select-none touch-manipulation cta-gold-ring ${
                  isLiveActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 border-transparent'
                    : isLiveConnecting
                      ? 'bg-gray-800/80 text-white/70 border-[hsl(var(--gold-primary))]/40'
                      : 'bg-gray-800/80 text-white/50 hover:text-white/80 hover:bg-gray-700/80'
                }`}
                aria-label={isLiveActive ? 'Stop live voice' : 'Start live voice'}
              >
                {/* Active glow ring */}
                {isLiveActive && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400/30 to-teal-400/20 blur-sm"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {isLiveConnecting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span className="text-[10px] font-medium leading-none">Live</span>
                </span>
              </button>
            )}

            {/* Waveform / Dictation button */}
            <VoiceButton
              voiceState={convoVoiceState}
              isEligible={isVoiceEligible}
              onToggle={onConvoToggle}
              onUpgrade={onVoiceUpgrade}
            />
          </div>
        )}

        {/* Input container — clean, no embedded Live button */}
        <div className="relative flex-1 min-w-0">
          <textarea
            value={inputMessage}
            onChange={e => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            rows={2}
            disabled={disabled}
            className={`w-full bg-white/5 border rounded-2xl px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 backdrop-blur-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isConvoActive ? 'border-primary/30 bg-primary/5' : isLiveActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10'
            }`}
          />
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
