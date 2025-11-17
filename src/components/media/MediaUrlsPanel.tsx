/**
 * MediaUrlsPanel Component
 * 
 * Displays URLs automatically extracted from trip chat messages
 * Users can open, copy, or promote URLs to Trip Links
 */

import React, { useEffect, useState } from 'react';
import { Link, ExternalLink, Copy, Plus, Globe, MapPin, Calendar, Youtube, Instagram } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { extractUrlsFromTripChat, NormalizedUrl } from '@/services/chatUrlExtractor';
import { truncateUrl } from '@/services/urlUtils';
import { toast } from '@/hooks/use-toast';
import { createTripLink } from '@/services/tripLinksService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';

interface MediaUrlsPanelProps {
  tripId: string;
  onPromoteToTripLink?: (url: NormalizedUrl) => void;
}

export const MediaUrlsPanel = ({ tripId, onPromoteToTripLink }: MediaUrlsPanelProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [urls, setUrls] = useState<NormalizedUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingLinkId, setPromotingLinkId] = useState<string | null>(null);

  useEffect(() => {
    fetchUrls();
  }, [tripId]);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      setError(null);
      const extractedUrls = await extractUrlsFromTripChat(tripId);
      setUrls(extractedUrls);
    } catch (err) {
      console.error('Error fetching URLs:', err);
      setError('Failed to load URLs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'URL copied to clipboard',
      variant: 'default',
    });
  };

  const handlePromote = async (urlData: NormalizedUrl) => {
    if (!tripId) {
      toast({
        title: 'Error',
        description: 'Trip ID is required',
        variant: 'destructive',
      });
      return;
    }

    // Generate demo user ID if needed
    const getDemoUserId = () => {
      let demoId = sessionStorage.getItem('demo-user-id');
      if (!demoId) {
        demoId = `demo-user-${Date.now()}`;
        sessionStorage.setItem('demo-user-id', demoId);
      }
      return demoId;
    };

    const effectiveUserId = user?.id || getDemoUserId();
    const urlId = urlData.messageId; // Use messageId as unique identifier

    setPromotingLinkId(urlId);

    try {
      // Use the new tripLinksService
      const result = await createTripLink(
        {
          tripId,
          url: urlData.url,
          title: urlData.title || truncateUrl(urlData.url, 50),
          description: urlData.description || `Shared in chat on ${formatDate(urlData.lastSeenAt)}`,
          category: 'other',
          addedBy: effectiveUserId,
        },
        isDemoMode
      );

      if (result) {
        // Also call the callback if provided
        if (onPromoteToTripLink) {
          onPromoteToTripLink(urlData);
        }
      }
    } catch (error) {
      console.error('[MediaUrlsPanel] Failed to promote URL:', error);
    } finally {
      setPromotingLinkId(null);
    }
  };

  const getDomainIcon = (domain: string) => {
    if (domain.includes('youtube')) return <Youtube className="w-4 h-4 text-red-400" />;
    if (domain.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-400" />;
    if (domain.includes('maps.google') || domain.includes('googlemaps')) return <MapPin className="w-4 h-4 text-green-400" />;
    if (domain.includes('ticketmaster') || domain.includes('eventbrite')) return <Calendar className="w-4 h-4 text-purple-400" />;
    return <Globe className="w-4 h-4 text-muted-foreground" />;
  };

  const getDomainColor = (domain: string) => {
    if (domain.includes('youtube')) return 'border-red-500/30 bg-red-500/5';
    if (domain.includes('instagram')) return 'border-pink-500/30 bg-pink-500/5';
    if (domain.includes('booking') || domain.includes('airbnb')) return 'border-blue-500/30 bg-blue-500/5';
    if (domain.includes('maps.google')) return 'border-green-500/30 bg-green-500/5';
    if (domain.includes('ticketmaster') || domain.includes('eventbrite')) return 'border-purple-500/30 bg-purple-500/5';
    if (domain.includes('nytimes') || domain.includes('timeout')) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-white/10 bg-white/5';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <Globe className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Error Loading URLs</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchUrls} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="text-center py-12">
        <Link className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No URLs Yet</h3>
        <p className="text-muted-foreground">
          Share a website in Chat and it shows up here automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          URLs from Chat ({urls.length})
        </h3>
      </div>

      {/* URL Cards */}
      <div className="space-y-3">
        {urls.map((urlData, index) => (
          <div
            key={`${urlData.messageId}-${index}`}
            className={`backdrop-blur-sm border rounded-lg p-4 hover:bg-white/10 transition-colors ${getDomainColor(urlData.domain)}`}
          >
            <div className="flex items-start gap-3">
              {/* Domain Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                {getDomainIcon(urlData.domain)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title or Domain */}
                <h4 className="text-foreground font-medium mb-1">
                  {urlData.title || urlData.domain}
                </h4>

                {/* URL Display */}
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground truncate" title={urlData.url}>
                    {truncateUrl(urlData.url, 50)}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{formatDate(urlData.lastSeenAt)}</span>
                  {urlData.postedBy?.name && (
                    <>
                      <span>•</span>
                      <span>by {urlData.postedBy.name}</span>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(urlData.url, '_blank')}
                    className="text-xs h-8"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(urlData.url)}
                    className="text-xs h-8"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy URL
                  </Button>
                  
                  {onPromoteToTripLink && (
                    <Button
                      size="sm"
                      onClick={() => handlePromote(urlData)}
                      disabled={promotingLinkId === urlData.messageId}
                      className="text-xs h-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {promotingLinkId === urlData.messageId ? 'Adding...' : 'Promote to Trip Link'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> URLs shared in Chat automatically appear here. 
          Use "Promote to Trip Link" to save important ones to your Places tab.
        </p>
      </div>
    </div>
  );
};
