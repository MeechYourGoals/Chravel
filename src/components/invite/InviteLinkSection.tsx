import React from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';

interface InviteLinkSectionProps {
  inviteLink: string;
  loading: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onRegenerate: () => void;
}

export const InviteLinkSection = ({ 
  inviteLink, 
  loading, 
  copied, 
  onCopyLink, 
  onRegenerate 
}: InviteLinkSectionProps) => {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-gray-300 text-sm">Share Link</label>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Regenerate
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 text-sm font-mono truncate">
          {loading ? 'Loading invite link...' : inviteLink || 'Generating link...'}
        </div>
        <button
          onClick={onCopyLink}
          disabled={loading || !inviteLink}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};