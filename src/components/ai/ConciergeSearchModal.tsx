import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Sparkles,
  Calendar,
  CheckSquare,
  BarChart2,
  CreditCard,
  MapPin,
  Link,
  Image,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUniversalSearch } from '@/hooks/useUniversalSearch';
import { ContentType, UniversalSearchResult } from '@/services/universalSearchService';

interface ConciergeSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onNavigate: (tab: string, id?: string) => void;
}

export const ConciergeSearchModal = ({
  open,
  onOpenChange,
  tripId,
  onNavigate,
}: ConciergeSearchModalProps) => {
  const [query, setQuery] = useState('');

  const contentTypes: ContentType[] = useMemo(() => [
    'concierge',
    'calendar',
    'task',
    'poll',
    'payment',
    'place',
    'link',
    'media'
  ], []);

  const { results, isLoading } = useUniversalSearch(query, {
    contentTypes,
    tripIds: [tripId],
  });

  const groupedResults = useMemo(() => {
    const groups: Partial<Record<ContentType, UniversalSearchResult[]>> = {};

    // Initialize groups in specific order if needed, or just let them be created
    results.forEach(result => {
      if (!groups[result.contentType]) {
        groups[result.contentType] = [];
      }
      groups[result.contentType]!.push(result);
    });
    return groups;
  }, [results]);

  const handleSelect = (result: UniversalSearchResult) => {
    // Map contentType to tab ID
    let tab = '';
    switch (result.contentType) {
      case 'concierge':
        tab = 'concierge';
        break;
      case 'calendar':
        tab = 'calendar';
        break;
      case 'task':
        tab = 'tasks';
        break;
      case 'poll':
        tab = 'polls';
        break;
      case 'payment':
        tab = 'payments';
        break;
      case 'place':
        tab = 'places';
        break;
      case 'link':
        // Links might be in Places or Basecamp tab.
        tab = 'places';
        break;
      case 'media':
        tab = 'media';
        break;
      default:
        tab = 'chat';
    }

    onNavigate(tab, result.id);
    onOpenChange(false);
  };

  const highlight = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;

    // Create snippet if text is long
    let display = text;
    if (text.length > 100) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 60);
        display = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    }

    const parts = display.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
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

  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'concierge': return <Sparkles size={14} className="text-emerald-400" />;
      case 'calendar': return <Calendar size={14} className="text-blue-400" />;
      case 'task': return <CheckSquare size={14} className="text-green-400" />;
      case 'poll': return <BarChart2 size={14} className="text-purple-400" />;
      case 'payment': return <CreditCard size={14} className="text-amber-400" />;
      case 'place': return <MapPin size={14} className="text-red-400" />;
      case 'link': return <Link size={14} className="text-cyan-400" />;
      case 'media': return <Image size={14} className="text-pink-400" />;
      default: return <Search size={14} className="text-neutral-400" />;
    }
  };

  const getLabel = (type: ContentType) => {
    switch (type) {
        case 'concierge': return 'Concierge';
        case 'calendar': return 'Calendar';
        case 'task': return 'Tasks';
        case 'poll': return 'Polls';
        case 'payment': return 'Payments';
        case 'place': return 'Places';
        case 'link': return 'Links';
        case 'media': return 'Media';
        default: return 'Other';
    }
  };

  // Order of categories to display
  const categoryOrder: ContentType[] = [
    'concierge', 'calendar', 'task', 'poll', 'payment', 'place', 'link', 'media'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="bg-neutral-900 border-white/10 text-white max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-white/5 bg-black/40">
          <DialogTitle className="text-white text-base sr-only">Search Concierge</DialogTitle>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search across trip..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
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
        </DialogHeader>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-neutral-900/95">
            {isLoading && (
                <div className="py-12 text-center text-neutral-500 text-sm animate-pulse flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span>Searching trip...</span>
                </div>
            )}

            {!isLoading && query.trim().length >= 2 && results.length === 0 && (
                <div className="py-12 text-center text-neutral-500 text-sm">
                    <p className="text-neutral-400 font-medium">No results found for "{query}"</p>
                    <p className="text-xs mt-2 text-neutral-600">Try searching tasks, events, places...</p>
                </div>
            )}

            {!isLoading && results.length > 0 && (
                <div className="py-2 space-y-4">
                    {categoryOrder.map(type => {
                        const items = groupedResults[type];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={type} className="space-y-1">
                                <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-white/5 backdrop-blur-sm sticky top-0 z-10 border-y border-white/5">
                                    {getIcon(type)}
                                    <span>{getLabel(type)}</span>
                                    <span className="ml-auto bg-white/10 text-white/70 px-1.5 rounded-sm">{items.length}</span>
                                </div>
                                <div className="space-y-0.5 px-2">
                                    {items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-all group flex items-start gap-3 active:scale-[0.99]"
                                        >
                                            <div className="mt-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity bg-white/5 p-1.5 rounded-md">
                                                {getIcon(type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <p className="text-sm font-medium text-neutral-200 truncate group-hover:text-white transition-colors">
                                                        {highlight(item.title, query)}
                                                    </p>
                                                    {item.timestamp && (
                                                        <span className="text-[10px] text-neutral-600 shrink-0 whitespace-nowrap">
                                                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                                                    {highlight(item.snippet, query)}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!query && (
                 <div className="py-16 text-center px-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                        <Sparkles className="text-emerald-400" size={24} />
                    </div>
                    <h3 className="text-white font-medium mb-1">Trip Search</h3>
                    <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6">
                        Search across Concierge, Calendar, Tasks, Places, and more.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                        {['Events', 'Tasks', 'Concierge', 'Places', 'Payments'].map(tag => (
                            <span key={tag} className="text-xs bg-white/5 border border-white/5 text-neutral-400 px-2.5 py-1 rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
