export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /**
   * True while this message is being streamed live from a Gemini Live voice session.
   * Used by MessageRenderer to display a pulsing "Speaking…" indicator below the bubble.
   * Cleared when the turn finalises and the completed message replaces this transient one.
   */
  isStreamingVoice?: boolean;
}

export interface GeminiAPIConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

export interface ReplyData {
  id: string;
  text: string;
  senderName: string;
}

export interface MessageReactionBarProps {
  messageId: string;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  className?: string;
}
