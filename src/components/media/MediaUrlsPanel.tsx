/**
 * MediaUrlsPanel Component
 *
 * Displays URLs from two sources:
 * 1. Automatically extracted from trip chat messages (trip_link_index with message_id)
 * 2. Manually added via the "Add Link" form (trip_link_index without message_id)
 *
 * Users can open, copy, delete, or promote URLs to Trip Links.
 * Manual additions do NOT auto-post to chat.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Link,
  ExternalLink,
  Copy,
  Plus,
  Globe,
  MapPin,
  Calendar,
  Youtube,
  Instagram,
  Trash2,
  Loader2,
  MessageCircle,
  Upload,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { truncateUrl, getDomain } from '@/services/urlUtils';
import { toast } from '@/hooks/use-toast';
import { createTripLink } from '@/services/tripLinksService';
import { insertLinkIndex, fetchOpenGraphData } from '@/services/linkService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { NormalizedUrl } from '@/services/chatUrlExtractor';

type LinkIndexRow = Database['public']['Tables']['trip_link_index']['Row'];

interface MediaLink {
  id: string;
  url: string;
  domain: string;
  title: string;
  description: string;
  image?: string;
  createdAt: string;
  source: 'chat' | 'manual';
}

interface MediaUrlsPanelProps {
  tripId: string;
  onPromoteToTripLink?: (url: NormalizedUrl) => void;
}

export const MediaUrlsPanel = ({ tripId, onPromoteToTripLink }: MediaUrlsPanelProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [links, setLinks] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingLinkId, setPromotingLinkId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  // Add Link form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const mapRowToLink = useCallback((row: LinkIndexRow): MediaLink => {
    return {
      id: row.id,
      url: row.url,
      domain: row.domain || getDomain(row.url),
      title: row.og_title || getDomain(row.url),
      description: row.og_description || '',
      image: row.og_image_url || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      source: row.message_id ? 'chat' : 'manual',
    };
  }, []);

  const fetchLinks = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        // Demo data
        setLinks([
          {
            id: 'demo-1',
            url: 'https://www.airbnb.com/rooms/12345678',
            domain: 'airbnb.com',
            title: 'Cozy 3BR Apartment in Downtown',
            description: '',
            createdAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
            source: 'chat',
          },
          {
            id: 'demo-2',
            url: 'https://www.youtube.com/watch?v=abc123',
            domain: 'youtube.com',
            title: 'Best Places to Visit Guide',
            description: '',
            createdAt: new Date(Date.now() - 86_400_000).toISOString(),
            source: 'chat',
          },
        ]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('trip_link_index')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[MediaUrlsPanel] Supabase error:', fetchError);
        setError('Failed to load links. Please try again.');
        return;
      }

      setLinks((data || []).map(mapRowToLink));
    } catch (err) {
      console.error('[MediaUrlsPanel] Error fetching links:', err);
      setError('Failed to load links. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tripId, isDemoMode, mapRowToLink]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Realtime subscription for new link inserts
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`media-urls:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_link_index',
          filter: `trip_id=eq.${tripId}`,
        },
        payload => {
          const newLink = mapRowToLink(payload.new as LinkIndexRow);
          setLinks(prev => {
            // Dedupe by id
            if (prev.some(l => l.id === newLink.id)) return prev;
            return [newLink, ...prev];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trip_link_index',
          filter: `trip_id=eq.${tripId}`,
        },
        payload => {
          const deletedId = (payload.old as LinkIndexRow).id;
          setLinks(prev => prev.filter(l => l.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, mapRowToLink]);

  const handleAddLink = async () => {
    const trimmed = addUrl.trim();
    if (!trimmed) return;

    // Validate URL
    let validUrl: string;
    try {
      // Auto-prepend https:// if missing
      validUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      new URL(validUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      // Fetch OG metadata
      let ogData: { title?: string; description?: string; image?: string; domain: string };
      try {
        ogData = await fetchOpenGraphData(validUrl);
      } catch {
        ogData = { domain: getDomain(validUrl) };
      }

      // Insert into trip_link_index WITHOUT message_id (manual add, no chat posting)
      await insertLinkIndex({
        tripId,
        url: validUrl,
        ogTitle: ogData.title || null,
        ogDescription: ogData.description || null,
        ogImage: ogData.image || null,
        domain: ogData.domain || getDomain(validUrl),
        messageId: null, // No message_id = manual add
      });

      toast({
        title: 'Link added',
        description: 'Link saved to Media',
      });

      setAddUrl('');
      setShowAddForm(false);
      // Realtime will update the list, but also do a manual refresh for reliability
      await fetchLinks();
    } catch (err) {
      console.error('[MediaUrlsPanel] Failed to add link:', err);
      toast({
        title: 'Failed to add link',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (isDemoMode) {
      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast({ title: 'Link deleted (demo mode)' });
      return;
    }

    setDeletingLinkId(linkId);
    try {
      const { error: deleteError } = await supabase
        .from('trip_link_index')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast({ title: 'Link deleted' });
    } catch (err) {
      console.error('[MediaUrlsPanel] Failed to delete link:', err);
      toast({
        title: 'Failed to delete link',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeletingLinkId(null);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'URL copied to clipboard',
    });
  };

  const handlePromote = async (link: MediaLink) => {
    if (!tripId || !onPromoteToTripLink) return;

    const getDemoUserId = () => {
      let demoId = sessionStorage.getItem('demo-user-id');
      if (!demoId) {
        demoId = `demo-user-${Date.now()}`;
        sessionStorage.setItem('demo-user-id', demoId);
      }
      return demoId;
    };

    const effectiveUserId = user?.id || getDemoUserId();

    setPromotingLinkId(link.id);
    try {
      const result = await createTripLink(
        {
          tripId,
          url: link.url,
          title: link.title || truncateUrl(link.url, 50),
          description: link.description || `Added on ${formatDate(link.createdAt)}`,
          category: 'other',
          addedBy: effectiveUserId,
        },
        isDemoMode,
      );

      if (result) {
        const urlData: NormalizedUrl = {
          url: link.url,
          rawUrl: link.url,
          domain: link.domain,
          firstSeenAt: link.createdAt,
          lastSeenAt: link.createdAt,
          messageId: link.id,
          title: link.title,
          description: link.description,
          image: link.image,
        };
        onPromoteToTripLink(urlData);
      }
    } catch (err) {
      console.error('[MediaUrlsPanel] Failed to promote URL:', err);
    } finally {
      setPromotingLinkId(null);
    }
  };

  const getDomainIcon = (domain: string) => {
    if (domain.includes('youtube')) return <Youtube className="w-4 h-4 text-red-400" />;
    if (domain.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-400" />;
    if (domain.includes('maps.google') || domain.includes('googlemaps'))
      return <MapPin className="w-4 h-4 text-green-400" />;
    if (domain.includes('ticketmaster') || domain.includes('eventbrite'))
      return <Calendar className="w-4 h-4 text-purple-400" />;
    return <Globe className="w-4 h-4 text-muted-foreground" />;
  };

  const getDomainColor = (domain: string) => {
    if (domain.includes('youtube')) return 'border-red-500/30 bg-red-500/5';
    if (domain.includes('instagram')) return 'border-pink-500/30 bg-pink-500/5';
    if (domain.includes('booking') || domain.includes('airbnb'))
      return 'border-blue-500/30 bg-blue-500/5';
    if (domain.includes('maps.google')) return 'border-green-500/30 bg-green-500/5';
    if (domain.includes('ticketmaster') || domain.includes('eventbrite'))
      return 'border-purple-500/30 bg-purple-500/5';
    if (domain.includes('nytimes') || domain.includes('timeout'))
      return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-white/10 bg-white/5';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Links</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchLinks} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const chatLinks = links.filter(l => l.source === 'chat');
  const manualLinks = links.filter(l => l.source === 'manual');

  return (
    <div className="space-y-4">
      {/* Header with Add Link button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Links ({links.length})</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs"
        >
          <Plus className="w-4 h-4 mr-1" />+ Add Link
        </Button>
      </div>

      {/* Add Link Form (inline, no chat posting) */}
      {showAddForm && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddLink();
              }}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddLink}
              disabled={isAdding || !addUrl.trim()}
              className="text-xs"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setAddUrl('');
              }}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link will be saved to Media only (not posted to Chat).
          </p>
        </div>
      )}

      {/* Empty state */}
      {links.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Link className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Links Yet</h3>
          <p className="text-muted-foreground">Share a URL in Chat or add one here manually</p>
        </div>
      )}

      {/* Chat Links Section */}
      {chatLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="w-3 h-3" />
            <span>From Chat ({chatLinks.length})</span>
          </div>
          {chatLinks.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              getDomainIcon={getDomainIcon}
              getDomainColor={getDomainColor}
              formatDate={formatDate}
              onCopy={handleCopyUrl}
              onDelete={handleDeleteLink}
              onPromote={onPromoteToTripLink ? () => handlePromote(link) : undefined}
              isPromoting={promotingLinkId === link.id}
              isDeleting={deletingLinkId === link.id}
            />
          ))}
        </div>
      )}

      {/* Manual Links Section */}
      {manualLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="w-3 h-3" />
            <span>Added Here ({manualLinks.length})</span>
          </div>
          {manualLinks.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              getDomainIcon={getDomainIcon}
              getDomainColor={getDomainColor}
              formatDate={formatDate}
              onCopy={handleCopyUrl}
              onDelete={handleDeleteLink}
              onPromote={onPromoteToTripLink ? () => handlePromote(link) : undefined}
              isPromoting={promotingLinkId === link.id}
              isDeleting={deletingLinkId === link.id}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      {links.length > 0 && (
        <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Links shared in Chat automatically appear here. You can also add links manually using
            the "+ Add Link" button above.
          </p>
        </div>
      )}
    </div>
  );
};

/** Reusable link card */
function LinkCard({
  link,
  getDomainIcon,
  getDomainColor,
  formatDate,
  onCopy,
  onDelete,
  onPromote,
  isPromoting,
  isDeleting,
}: {
  link: MediaLink;
  getDomainIcon: (domain: string) => React.ReactNode;
  getDomainColor: (domain: string) => string;
  formatDate: (dateString: string) => string;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
  onPromote?: () => void;
  isPromoting: boolean;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`backdrop-blur-sm border rounded-lg p-4 hover:bg-white/10 transition-colors relative ${getDomainColor(link.domain)}`}
    >
      {/* Delete button */}
      <button
        onClick={() => onDelete(link.id)}
        disabled={isDeleting}
        className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 transition-colors"
        aria-label="Delete link"
      >
        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      </button>

      <div className="flex items-start gap-3 pr-10">
        {/* Domain Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          {getDomainIcon(link.domain)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-foreground font-medium mb-1">{link.title || link.domain}</h4>

          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground truncate" title={link.url}>
              {truncateUrl(link.url, 50)}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span>{formatDate(link.createdAt)}</span>
            <Badge variant="outline" className="text-xs">
              {link.source === 'chat' ? 'From chat' : 'Added here'}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(link.url, '_blank')}
              className="text-xs h-8"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(link.url)}
              className="text-xs h-8"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy URL
            </Button>

            {onPromote && (
              <Button
                size="sm"
                onClick={onPromote}
                disabled={isPromoting}
                className="text-xs h-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                {isPromoting ? 'Adding...' : 'Promote to Trip Link'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
