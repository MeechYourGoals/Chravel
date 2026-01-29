import { useConversation } from '@elevenlabs/react';
import { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VoiceConciergeProps {
  tripId: string;
  onTranscript?: (text: string) => void;
  onAgentResponse?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceConcierge({ 
  tripId, 
  onTranscript, 
  onAgentResponse,
  disabled = false,
  className 
}: VoiceConciergeProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[VoiceConcierge] Connected to ElevenLabs');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[VoiceConcierge] Disconnected');
    },
    onMessage: (message) => {
      console.log('[VoiceConcierge] Message:', message);
      
      // Handle user transcript - access properties safely
      const msgAny = message as unknown as { 
        type?: string; 
        user_transcription_event?: { user_transcript?: string };
        agent_response_event?: { agent_response?: string };
      };
      
      if (msgAny.type === 'user_transcript') {
        const transcript = msgAny.user_transcription_event?.user_transcript;
        if (transcript) {
          onTranscript?.(transcript);
        }
      }
      
      // Handle agent response
      if (msgAny.type === 'agent_response') {
        const response = msgAny.agent_response_event?.agent_response;
        if (response) {
          onAgentResponse?.(response);
        }
      }
    },
    onError: (message, context) => {
      console.error('[VoiceConcierge] Error:', message, context);
      setError('Voice connection failed. Please try again.');
      setIsConnecting(false);
    },
  });

  const startVoice = useCallback(async () => {
    if (disabled) return;
    
    setIsConnecting(true);
    setError(null);
    setPermissionDenied(false);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get conversation token from edge function
      const { data, error: invokeError } = await supabase.functions.invoke(
        'elevenlabs-conversation-token'
      );

      if (invokeError) {
        console.error('[VoiceConcierge] Token error:', invokeError);
        throw new Error(invokeError.message || 'Failed to get voice token');
      }

      if (!data?.token) {
        throw new Error('No voice token received');
      }

      console.log('[VoiceConcierge] Starting session with token');

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });

    } catch (err) {
      console.error('[VoiceConcierge] Start error:', err);
      
      // Check for permission denied
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Microphone access denied. Please enable it in your browser settings.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start voice');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, disabled]);

  const stopVoice = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('[VoiceConcierge] Stop error:', err);
    }
  }, [conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isConnected ? (
        <Button
          onClick={startVoice}
          disabled={isConnecting || disabled || permissionDenied}
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full min-w-[48px] min-h-[48px] w-12 h-12",
            "border-white/20 bg-white/5 hover:bg-white/10",
            "transition-all duration-200",
            isConnecting && "animate-pulse bg-primary/20"
          )}
          aria-label={isConnecting ? "Connecting..." : "Start voice conversation"}
          title={permissionDenied ? "Microphone access denied" : "Tap to speak"}
        >
          <Mic 
            size={22} 
            className={cn(
              "text-white",
              isConnecting && "text-primary"
            )} 
          />
        </Button>
      ) : (
        <Button
          onClick={stopVoice}
          variant="destructive"
          size="icon"
          className={cn(
            "rounded-full min-w-[48px] min-h-[48px] w-12 h-12",
            "animate-pulse",
            "shadow-lg shadow-destructive/30"
          )}
          aria-label="Stop voice conversation"
          title="Tap to stop"
        >
          <MicOff size={22} />
        </Button>
      )}

      {/* Speaking indicator */}
      {isConnected && isSpeaking && (
        <div className="flex items-center gap-1.5 text-primary animate-pulse">
          <Volume2 size={18} />
          <span className="text-xs font-medium">Speaking...</span>
        </div>
      )}

      {/* Listening indicator */}
      {isConnected && !isSpeaking && (
        <div className="flex items-center gap-1.5 text-accent">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium">Listening...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <span className="text-destructive text-xs max-w-[150px] leading-tight">
          {error}
        </span>
      )}
    </div>
  );
}
