import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X, Mic, MicOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { VoiceButton } from './VoiceButton';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';

const LONG_PRESS_MS = 500;

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
  /** Conversation mode state (Gemini Live waveform button) */
  convoVoiceState?: VoiceState;
  /** Toggle conversation mode on/off */
  onConvoToggle?: () => void;
  /** Dictation mode state (mic inside input) */
  dictationVoiceState?: VoiceState;
  /** Toggle dictation on/off */
  onDictationToggle?: () => void;
  /** Live transcript while dictating */
  dictationTranscript?: string;
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
}

export const AiChatInput = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isTyping,
  disabled = false,
  usageStatus,
  onUpgradeClick,
  convoVoiceState = 'idle',
  onConvoToggle,
  dictationVoiceState = 'idle',
  onDictationToggle,
  dictationTranscript = '',
  isVoiceEligible = false,
  onVoiceUpgrade,
  onImageAttach,
  attachedImages = [],
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

  // --- Dictation mic long-press toast (mobile helper) ---
  const dictLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dictDidLongPress = useRef(false);

  const handleDictPressStart = useCallback(() => {
    dictDidLongPress.current = false;
    dictLongPressTimer.current = setTimeout(() => {
      dictDidLongPress.current = true;
      dictLongPressTimer.current = null;
      toast('Dictate text', {
        description: 'Talk to type — your words go into the text box',
        duration: 2000,
      });
    }, LONG_PRESS_MS);
  }, []);

  const handleDictPressEnd = useCallback(() => {
    if (dictLongPressTimer.current) {
      clearTimeout(dictLongPressTimer.current);
      dictLongPressTimer.current = null;
    }
  }, []);

  const handleDictClick = useCallback(() => {
    if (dictDidLongPress.current) {
      dictDidLongPress.current = false;
      return;
    }
    if (!isVoiceEligible) {
      onVoiceUpgrade?.();
      return;
    }
    onDictationToggle?.();
  }, [isVoiceEligible, onVoiceUpgrade, onDictationToggle]);

  const isLimitReached = usageStatus?.status === 'limit_reached';

  // Derived conversation active state
  const isConvoActive =
    isVoiceEligible && convoVoiceState !== 'idle' && convoVoiceState !== 'error';

  // Derived dictation active state
  const isDictating =
    isVoiceEligible &&
    (dictationVoiceState === 'listening' || dictationVoiceState === 'connecting');

  // Compute text box value, appending live transcript if active
  const displayValue = isDictating && dictationTranscript
    ? inputMessage + (inputMessage && !inputMessage.endsWith(' ') ? ' ' : '') + dictationTranscript
    : inputMessage;

  // Dynamic placeholder based on active mode
  const getPlaceholder = () => {
    if (isLimitReached) return 'Upgrade to continue chatting...';
    if (isConvoActive) return 'Conversation active\u2026';
    if (isDictating) return 'Dictating\u2026 speak now';
    return 'Ask me anything...';
  };

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

      {/* Conversation active badge — shows above the input row */}
      {isConvoActive && (
        <div className="flex items-center gap-2 px-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-blue-400">
            <span aria-hidden className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Live conversation
          </span>
        </div>
      )}

      <div className="chat-composer flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
        {/* Waveform / Conversation button (primary voice CTA) */}
        {onConvoToggle && (
          <VoiceButton
            voiceState={convoVoiceState}
            isEligible={isVoiceEligible}
            onToggle={onConvoToggle}
            onUpgrade={onVoiceUpgrade}
          />
        )}

        {/* Input container — textarea with inline dictation mic */}
        <div className="relative flex-1 min-w-0">
          <textarea
            value={displayValue}
            onChange={e => {
              if (isDictating) return; // Disallow manual edit while actively dictating (or we could stop dictation on type)
              onInputChange(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            rows={2}
            disabled={disabled || isLimitReached}
            className={`w-full bg-white/5 border rounded-2xl pl-4 pr-12 py-3 text-white placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 backdrop-blur-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isDictating
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : isConvoActive
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-white/10'
            }`}
          />

          {/* Dictation mic — inside input, right side */}
          {onDictationToggle && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleDictClick}
                    onTouchStart={handleDictPressStart}
                    onTouchEnd={handleDictPressEnd}
                    onTouchCancel={handleDictPressEnd}
                    onMouseDown={handleDictPressStart}
                    onMouseUp={handleDictPressEnd}
                    onMouseLeave={handleDictPressEnd}
                    disabled={disabled || isLimitReached || isConvoActive}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-full transition-all duration-200 active:scale-90 touch-manipulation select-none ${
                      isDictating
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isConvoActive
                          ? 'text-white/15 cursor-not-allowed'
                          : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                    style={{ minWidth: 44, minHeight: 44 }}
                    aria-label="Dictate text"
                  >
                    {isDictating ? <Mic size={15} className="animate-pulse" /> : <Mic size={15} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isDictating ? 'Stop dictation' : 'Dictate text'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Dictating pill — small indicator inside input */}
          {isDictating && (
            <span className="absolute left-3 top-1 text-[9px] font-semibold tracking-wider uppercase text-emerald-400/70 pointer-events-none select-none">
              Dictating&hellip;
            </span>
          )}
        </div>

        {/* Send button */}
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
