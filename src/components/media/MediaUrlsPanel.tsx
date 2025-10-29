import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, ArrowUpRight, Globe } from 'lucide-react';
import { extractUrlsFromTripChat } from '@/services/chatUrlExtractor';
import { NormalizedUrl, truncateUrlForDisplay } from '@/services/urlUtils';

export type PromotePrefill = {
  url?: string;
  title?: string;
  category?: 'restaurant'|'hotel'|'attraction'|'activity'|'other';
  note?: string;
};

interface MediaUrlsPanelProps {
  tripId: string;
  onPromoteToTripLink?: (prefill: PromotePrefill) => void;
  onCount?: (count: number) => void;
}

export const MediaUrlsPanel: React.FC<MediaUrlsPanelProps> = ({ tripId, onPromoteToTripLink, onCount }) => {
  const [urls, setUrls] = useState<NormalizedUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = import.meta.env.VITE_FEATURE_MEDIA_URLS !== 'false';

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await extractUrlsFromTripChat(tripId);
      setUrls(data);
      onCount?.(data.length);
    } catch (e) {
      console.error('Failed to load URLs from chat:', e);
      setError('Could not load URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, enabled]);

  const renderAvatar = (domain: string) => {
    const initials = (domain?.[0] || '?').toUpperCase();
    return (
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/90 text-sm font-semibold">
        {initials}
      </div>
    );
  };

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-3">{error}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">URLs from Chat</h3>
        <p className="text-muted-foreground">
          No URLs yet. Share a website in Chat and it shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-semibold text-foreground">
          URLs from Chat
        </h3>
        <Badge variant="outline" className="text-xs">{urls.length}</Badge>
      </div>

      <div className="space-y-3">
        {urls.map((url) => (
          <div key={`${url.url}-${url.messageId}`} className="bg-card border rounded-lg p-4 hover:bg-card/80 transition-colors">
            <div className="flex items-start gap-3">
              {renderAvatar(url.domain)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs bg-white/10 border-white/10">
                    {url.domain}
                  </Badge>
                  {url.title && (
                    <span className="text-xs text-muted-foreground truncate">{url.title}</span>
                  )}
                </div>
                <div className="text-sm text-foreground truncate" title={url.url}>
                  {truncateUrlForDisplay(url.url)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(url.url, '_blank')}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Open
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(url.url)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy URL
                  </Button>
                  <Button size="sm" onClick={() => onPromoteToTripLink?.({ url: url.url, title: url.title })}>
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Promote to Trip Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
