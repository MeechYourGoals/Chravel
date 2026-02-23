import React, { useState, useMemo, useCallback } from 'react';
import { Search, MessageSquare, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import type { ChatMessage } from '@/components/AIConciergeChat';

interface ConciergeSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  onSelectMessage: (messageId: string) => void;
}

export const ConciergeSearchModal = ({
  open,
  onOpenChange,
  messages,
  onSelectMessage,
}: ConciergeSearchModalProps) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return messages.filter(m => m.content.toLowerCase().includes(q));
  }, [debouncedQuery, messages]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectMessage(id);
      onOpenChange(false);
      setQuery('');
    },
    [onSelectMessage, onOpenChange],
  );

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 60);
    const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    const parts = snippet.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-emerald-500/30 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-base">Search Concierge</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search across trip stub */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-neutral-500">Search across trip</span>
          <span className="text-[10px] bg-white/10 text-neutral-400 px-1.5 py-0.5 rounded">
            Coming soon
          </span>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {debouncedQuery.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">No messages found</p>
          )}
          {results.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <MessageSquare
                  size={14}
                  className={`mt-0.5 shrink-0 ${msg.type === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    {msg.type === 'user' ? 'You' : 'Concierge'}
                  </span>
                  <p className="text-sm text-neutral-300 line-clamp-2">
                    {highlight(msg.content, debouncedQuery.trim())}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
