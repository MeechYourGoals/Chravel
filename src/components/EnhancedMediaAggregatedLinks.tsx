import React, { useEffect, useState } from 'react';
import { Link, ExternalLink, MessageCircle, Globe, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import MockDataService from '@/services/mockDataService';
import { extractUrlsFromTripChat } from '@/services/chatUrlExtractor';

interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  domain: string;
  og_image_url?: string;
  created_at: string;
  source: 'chat' | 'manual';
  postedBy?: {
    id: string;
    name?: string;
  };
}

interface EnhancedMediaAggregatedLinksProps {
  tripId: string;
}

export const EnhancedMediaAggregatedLinks = ({ tripId }: EnhancedMediaAggregatedLinksProps) => {
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useDemoMode();

  useEffect(() => {
    fetchLinkItems();
  }, [tripId, isDemoMode]);

  const fetchLinkItems = async () => {
    try {
      // Use chat URL extractor to get URLs from chat messages
      const chatUrls = await extractUrlsFromTripChat(tripId, { isDemoMode });

      // Fetch manually added links from trip_links
      const { data: manualLinks, error: linkError } = await supabase
        .from('trip_links')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (linkError) throw linkError;

      // Combine both sources
      const allLinks: LinkItem[] = [
        // URLs extracted from chat
        ...chatUrls.map(item => ({
          id: item.messageId,
          url: item.url,
          title: item.title || item.domain || 'Link',
          domain: item.domain,
          created_at: item.lastSeenAt,
          source: 'chat' as const,
          postedBy: item.postedBy,
        })),
        // Manually added links
        ...(manualLinks || []).map(item => ({
          id: item.id,
          url: item.url,
          title: item.title,
          description: item.description,
          domain: new URL(item.url).hostname,
          created_at: item.created_at,
          source: 'manual' as const
        }))
      ];

      // Sort by date descending and remove duplicates
      const uniqueLinks = allLinks.filter((link, index, self) => 
        index === self.findIndex(l => l.url === link.url)
      );
      uniqueLinks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLinkItems(uniqueLinks);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDomainIcon = (domain: string) => {
    if (domain.includes('maps.google') || domain.includes('googlemaps')) {
      return <MapPin className="w-4 h-4 text-blue-400" />;
    }
    if (domain.includes('ticketmaster') || domain.includes('eventbrite')) {
      return <Calendar className="w-4 h-4 text-purple-400" />;
    }
    return <Globe className="w-4 h-4 text-muted-foreground" />;
  };

  const getDomainColor = (domain: string) => {
    if (domain.includes('youtube')) return 'border-red-500/30 bg-red-500/5';
    if (domain.includes('instagram')) return 'border-pink-500/30 bg-pink-500/5';
    if (domain.includes('booking') || domain.includes('airbnb')) return 'border-blue-500/30 bg-blue-500/5';
    if (domain.includes('maps.google')) return 'border-green-500/30 bg-green-500/5';
    if (domain.includes('ticketmaster')) return 'border-purple-500/30 bg-purple-500/5';
    if (domain.includes('nytimes') || domain.includes('timeout')) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-white/10 bg-white/5';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (linkItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Link className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Links Yet</h3>
        <p className="text-muted-foreground">
          Links shared in chat or manually added will appear here automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {linkItems.map((item) => (
        <div 
          key={item.id} 
          className={`backdrop-blur-sm border rounded-lg p-4 hover:bg-white/10 transition-colors ${getDomainColor(item.domain)}`}
        >
          <div className="flex items-start gap-4">
            {item.og_image_url ? (
              <img
                src={item.og_image_url}
                alt={item.title}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                {getDomainIcon(item.domain)}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate mb-1">{item.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getDomainIcon(item.domain)}
                    <p className="text-sm text-muted-foreground">{item.domain}</p>
                  </div>
                  {item.postedBy && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Posted by {item.postedBy.name}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.source === 'chat' ? (
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground px-2 py-1 bg-white/5 rounded-full">
                  {item.source === 'chat' ? 'From chat' : 'Manually added'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Dev/Demo Controls */}
      {(isDemoMode || MockDataService.isUsingMockData()) && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-200 mb-2">
            🚧 Development Mode: Using mock data
          </p>
          <button
            onClick={async () => {
              await MockDataService.reseedMockData(tripId);
              fetchLinkItems();
            }}
            className="text-xs px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-md transition-colors"
          >
            Reseed Mock Data
          </button>
        </div>
      )}
    </div>
  );
};