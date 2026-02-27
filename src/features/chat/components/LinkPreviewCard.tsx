import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { linkPreviewService, LinkPreview } from '@/services/linkPreviewService';

interface LinkPreviewCardProps {
  url: string;
  className?: string;
  onPreviewLoaded?: (preview: LinkPreview) => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  url,
  className,
  onPreviewLoaded,
}) => {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchPreview() {
      try {
        setLoading(true);
        const data = await linkPreviewService.getLinkPreview(url);

        if (mounted) {
          if (data.status === 'ok') {
            setPreview(data);
            onPreviewLoaded?.(data);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Debounce slightly to avoid rapid rerenders on fast typing if this were an input
    // Here it's for messages, so immediate is fine, but good practice.
    const timer = setTimeout(fetchPreview, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  if (loading) {
    return (
      <div className={cn("w-full max-w-sm rounded-lg border border-border/50 bg-card/50 overflow-hidden mt-2", className)}>
        <Skeleton className="h-32 w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !preview) {
    // Graceful fallback: just show the domain/URL
    let domain: string;
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch {
      domain = 'Link';
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
            "flex items-center gap-2 p-2 mt-2 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors max-w-sm",
            className
        )}
      >
        <div className="bg-muted p-1.5 rounded flex-shrink-0">
            <Link2 size={16} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{domain}</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>
      </a>
    );
  }

  const { title, description, imageUrl, faviconUrl, siteName, resolvedUrl } = preview;
  let domain: string;
  try {
    domain = new URL(resolvedUrl || url).hostname.replace('www.', '');
  } catch {
    domain = 'Link';
  }

  // Heuristics for special types
  const isGoogleMaps = domain.includes('maps.google') || domain.includes('goo.gl/maps');
  const isTravelSite = ['airbnb.com', 'booking.com', 'expedia.com', 'tripadvisor.com'].some(d => domain.includes(d));

  return (
    <a
      href={resolvedUrl || url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block w-full max-w-sm rounded-lg border border-border/50 bg-card overflow-hidden mt-2 hover:border-primary/30 transition-all group no-underline text-inherit",
        className
      )}
    >
      {/* Hero Image */}
      {imageUrl && (
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={title || "Link preview"}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            onError={(e) => {
                // Hide image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {isGoogleMaps && (
              <div className="absolute top-2 right-2 bg-white/90 text-black p-1.5 rounded-full shadow-sm">
                  <MapPin size={16} />
              </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site attribution */}
        <div className="flex items-center gap-1.5 mb-1.5">
            {faviconUrl ? (
                <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />
            ) : (
                <Link2 size={12} className="text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground font-medium truncate">
                {siteName || domain}
            </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {title || domain}
        </h4>

        {/* Description */}
        {description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {description}
            </p>
        )}

        {/* Footer / Domain fallback if no description */}
        {!description && !imageUrl && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
                <ExternalLink size={10} />
                <span className="truncate">{url}</span>
            </div>
        )}
      </div>
    </a>
  );
};
