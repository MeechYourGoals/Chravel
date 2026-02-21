import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, Loader2, Volume2, Square, AudioLines } from 'lucide-react';
import { useGeminiLive, type GeminiLiveState } from '@/hooks/useGeminiLive';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface VoiceConciergeProps {
  tripId: string;
  onAddMessage: (msg: ChatMessage) => void;
  onUpdateMessage: (id: string, content: string) => void;
  onStateChange: (state: GeminiLiveState) => void;
  disabled?: boolean;
}

/**
 * VoiceConcierge manages the full Gemini Live voice session lifecycle.
 *
 * It renders a mic button and voice status indicator. During a voice session:
 * - User speech appears as a draft message that updates with partial transcripts
 * - Assistant responses stream into an assistant message bubble
 * - Audio plays through a scheduled playback queue
 * - Barge-in stops playback instantly and restarts listening
 * - Completed turns are persisted to ai_queries
 */
export const VoiceConcierge: React.FC<VoiceConciergeProps> = ({
  tripId,
  onAddMessage,
  onUpdateMessage,
  onStateChange,
  disabled = false,
}) => {
  const draftUserMsgIdRef = useRef<string | null>(null);
  const draftAssistantMsgIdRef = useRef<string | null>(null);
  const prevStateRef = useRef<GeminiLiveState>('idle');

  const handleTurnComplete = useCallback(
    (userText: string, assistantText: string) => {
      // Finalize draft messages with final content
      if (draftUserMsgIdRef.current && userText) {
        onUpdateMessage(draftUserMsgIdRef.current, userText);
      }
      if (draftAssistantMsgIdRef.current && assistantText) {
        onUpdateMessage(draftAssistantMsgIdRef.current, assistantText);
      }

      draftUserMsgIdRef.current = null;
      draftAssistantMsgIdRef.current = null;

      // Persist to ai_queries (fire-and-forget; never block UX)
      if (userText || assistantText) {
        persistVoiceTurn(tripId, userText, assistantText);
      }
    },
    [tripId, onUpdateMessage],
  );

  const {
    state,
    error,
    userTranscript,
    assistantTranscript,
    startSession,
    endSession,
    isSupported,
  } = useGeminiLive({
    tripId,
    onTurnComplete: handleTurnComplete,
  });

  // Notify parent of state changes
  useEffect(() => {
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;
      onStateChange(state);
    }
  }, [state, onStateChange]);

  // Manage draft user message: create on listening, update with transcript
  useEffect(() => {
    if (state === 'listening' || state === 'thinking') {
      if (!draftUserMsgIdRef.current && userTranscript) {
        const id = `voice-user-${Date.now()}`;
        draftUserMsgIdRef.current = id;
        onAddMessage({
          id,
          type: 'user',
          content: userTranscript,
          timestamp: new Date().toISOString(),
        });
      } else if (draftUserMsgIdRef.current && userTranscript) {
        onUpdateMessage(draftUserMsgIdRef.current, userTranscript);
      }
    }
  }, [state, userTranscript, onAddMessage, onUpdateMessage]);

  // Manage draft assistant message: create on speaking, update with transcript
  useEffect(() => {
    if (state === 'speaking' && assistantTranscript) {
      if (!draftAssistantMsgIdRef.current) {
        const id = `voice-assistant-${Date.now()}`;
        draftAssistantMsgIdRef.current = id;
        onAddMessage({
          id,
          type: 'assistant',
          content: assistantTranscript,
          timestamp: new Date().toISOString(),
        });
      } else {
        onUpdateMessage(draftAssistantMsgIdRef.current, assistantTranscript);
      }
    }
  }, [state, assistantTranscript, onAddMessage, onUpdateMessage]);

  const handleToggle = useCallback(() => {
    if (disabled) return;

    if (state === 'idle' || state === 'error') {
      // Reset draft refs for a fresh session
      draftUserMsgIdRef.current = null;
      draftAssistantMsgIdRef.current = null;
      void startSession();
    } else {
      endSession();
    }
  }, [state, startSession, endSession, disabled]);

  const isActive = state === 'listening' || state === 'speaking' || state === 'thinking';

  const buttonStyle = useMemo(() => {
    if (disabled || !isSupported) {
      return 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed';
    }
    switch (state) {
      case 'listening':
        return 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-1 ring-emerald-200/60 shadow-lg shadow-emerald-500/25';
      case 'thinking':
      case 'connecting':
        return 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30';
      case 'speaking':
        return 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/30';
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30';
      default:
        return 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:opacity-90 shadow-lg shadow-emerald-500/25';
    }
  }, [state, disabled, isSupported]);

  const buttonIcon = useMemo(() => {
    if (disabled || !isSupported) return <MicOff size={16} className="opacity-70" />;
    switch (state) {
      case 'connecting':
      case 'thinking':
        return <Loader2 size={16} className="animate-spin" />;
      case 'listening':
        return <Mic size={16} />;
      case 'speaking':
        return <Volume2 size={16} />;
      case 'error':
        return <MicOff size={16} />;
      default:
        return <Mic size={16} />;
    }
  }, [state, disabled, isSupported]);

  const tooltip = useMemo(() => {
    if (disabled || !isSupported) return 'Voice not available';
    switch (state) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening — tap to stop';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return 'Tap to interrupt';
      case 'error':
        return error || 'Tap to retry';
      default:
        return 'Start voice';
    }
  }, [state, disabled, isSupported, error]);

  return (
    <div className="flex items-center gap-2">
      {/* Voice status indicator (compact) */}
      {isActive && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
          {state === 'listening' && (
            <>
              <AudioLines size={12} className="text-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-300">Listening</span>
            </>
          )}
          {state === 'thinking' && (
            <>
              <Loader2 size={12} className="text-cyan-400 animate-spin" />
              <span className="text-[11px] text-cyan-300">Thinking</span>
            </>
          )}
          {state === 'speaking' && (
            <>
              <Volume2 size={12} className="text-blue-400 animate-pulse" />
              <span className="text-[11px] text-blue-300">Speaking</span>
            </>
          )}
        </div>
      )}

      {/* End session button (visible when active) */}
      {isActive && (
        <button
          type="button"
          onClick={endSession}
          className="size-8 rounded-full flex items-center justify-center bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all duration-200 shrink-0"
          aria-label="End voice session"
        >
          <Square size={12} />
        </button>
      )}

      {/* Main mic button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || !isSupported}
        className={`relative size-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${buttonStyle}`}
        aria-label={tooltip}
        title={tooltip}
      >
        {/* Pulse rings for active states */}
        {isActive && (
          <>
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-full animate-[voice-pulse_2s_ease-out_infinite] ${
                state === 'listening' ? 'bg-emerald-400/25' : 'bg-blue-400/25'
              }`}
            />
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-full animate-[voice-pulse_2s_ease-out_0.6s_infinite] ${
                state === 'listening' ? 'bg-emerald-400/15' : 'bg-blue-400/15'
              }`}
            />
          </>
        )}
        <span className="relative z-10">{buttonIcon}</span>
      </button>
    </div>
  );
};

/**
 * Persist a completed voice turn to ai_queries. Fire-and-forget pattern:
 * if persistence fails, the UX is not affected.
 */
async function persistVoiceTurn(
  tripId: string,
  userText: string,
  assistantText: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('ai_queries').insert({
      trip_id: tripId,
      user_id: user.id,
      query_text: userText || '[voice input]',
      response_text: assistantText || '[voice response]',
      source_count: 0,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Persistence failure must never block voice UX
  }
}
