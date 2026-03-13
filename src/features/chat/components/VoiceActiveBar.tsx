import React from 'react';
import { X } from 'lucide-react';
import type { GeminiLiveState } from '@/hooks/useGeminiLive';

interface VoiceActiveBarProps {
  liveState: GeminiLiveState;
  onTap: () => void;
  onEnd: () => void;
}

function compactLabel(state: GeminiLiveState): string {
  switch (state) {
    case 'requesting_mic':
    case 'ready':
      return 'Connecting…';
    case 'listening':
    case 'interrupted':
      return 'Listening';
    case 'sending':
      return 'Thinking';
    case 'playing':
      return 'Speaking';
    default:
      return 'Live';
  }
}

/**
 * VoiceActiveBar — compact indicator shown at the top of chat when
 * a Gemini Live session is active but the overlay is hidden.
 * Tap to re-open the overlay, X to end the session.
 */
export function VoiceActiveBar({ liveState, onTap, onEnd }: VoiceActiveBarProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onTap();
      }}
      className="flex items-center gap-2 px-3 py-2 mx-2 mt-1 rounded-lg bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border border-emerald-500/20 cursor-pointer hover:from-emerald-900/80 transition-colors"
    >
      {/* Green pulse dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>

      <span className="text-xs font-medium text-white/80 flex-1 truncate">
        Live conversation · {compactLabel(liveState)}
      </span>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onEnd();
        }}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="End voice session"
      >
        <X size={14} className="text-white/60" />
      </button>
    </div>
  );
}
