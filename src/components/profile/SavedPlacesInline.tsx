import React from 'react';
import { Bookmark, ExternalLink, Star, MapPin } from 'lucide-react';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

export const SavedPlacesInline: React.FC = () => {
  const { items, loading, toggleSave, refresh } = useSavedRecommendations();
  const navigate = useNavigate();

  const handleViewAll = () => {
    navigate('/?openSettings=saved-recs');
  };

  const handleDiscover = () => {
    navigate('/search');
  };

  const handleToggle = async (item: any) => {
    if (!item?.data) return;
    await toggleSave(item.data);
    await refresh();
  };

  return (
    <section aria-labelledby="saved-places-heading" className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="saved-places-heading"
          className="text-lg font-semibold text-foreground flex items-center gap-2"
        >
          <Bookmark className="w-5 h-5 text-primary" aria-hidden="true" />
          Saved Places
        </h2>
        <div className="flex items-center gap-2">
          {/* Mobile: icon only */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleViewAll}
                  className="md:hidden p-2 rounded-md hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="View all saved places"
                  title="View all"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View All</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Desktop: text button */}
          <button
            onClick={handleViewAll}
            className="hidden md:inline-flex text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div
          role="list"
          aria-busy="true"
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[260px] max-w-[260px] flex-shrink-0 snap-start">
              <div className="bg-card border border-border rounded-enterprise overflow-hidden shadow-enterprise">
                <Skeleton className="h-36 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-enterprise p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            No saved places yet. Explore trips and tap Save to collect your favorites.
          </p>
          <Button onClick={handleDiscover} className="mx-auto">
            Discover Places
          </Button>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Saved places list"
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
        >
          {items.map(item => {
            const title: string = item.title;
            const img = item.image_url;
            const category = item.rec_type;
            const city = item.location || item.city || '';
            const rating = item.data?.rating as number | undefined;
            const distance = item.data?.distance as string | undefined;
            const external = item.external_link || item.data?.externalLink || '#';

            return (
              <article
                key={item.id}
                role="listitem"
                tabIndex={0}
                className="min-w-[260px] max-w-[260px] flex-shrink-0 snap-start focus:outline-none"
                aria-label={title}
              >
                <div className="bg-card border border-border rounded-enterprise overflow-hidden shadow-enterprise hover:shadow-enterprise-md transition-shadow">
                  <div className="relative h-36 w-full">
                    {img ? (
                      <img
                        src={img}
                        alt={title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate" title={title}>
                          {title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="capitalize text-xs">
                            {category}
                          </Badge>
                          {city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[120px]" title={city}>
                                {city}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      {typeof rating === 'number' && (
                        <span className="inline-flex items-center gap-1 text-xs text-foreground/90">
                          <Star className="w-3.5 h-3.5 text-primary" /> {rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {distance && (
                      <div className="text-xs text-muted-foreground">{distance} away</div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(item)}
                        aria-pressed={true}
                        className="flex-1"
                      >
                        <Bookmark className="w-4 h-4 mr-1" /> Saved
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(external, '_blank', 'noopener')}
                        className="flex-1"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
