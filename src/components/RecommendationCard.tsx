import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MapPin, Star, ChevronLeft, ChevronRight, Users, Bookmark } from 'lucide-react';
import { Recommendation } from '../data/recommendations';
import { useIsMobile } from '../hooks/use-mobile';
import { OptimizedImage } from './mobile/OptimizedImage';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onSaveToTrip?: (id: number) => void;
}

export const RecommendationCard = ({ 
  recommendation, 
  onSaveToTrip
}: RecommendationCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isMobile = useIsMobile();

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === recommendation.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? recommendation.images.length - 1 : prev - 1
    );
  };

  const getPriceLevelText = (level: number) => {
    return '$'.repeat(level);
  };

  const handleCTA = () => {
    window.open(recommendation.externalLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="group relative overflow-hidden bg-card/80 backdrop-blur-md border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-enterprise-md">
      {/* Header with title and sponsor badge */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-h3 md:text-h3-desktop line-clamp-1">
              {recommendation.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {recommendation.rating}
                </span>
              </div>
              <span className="text-muted-foreground text-sm">
                {getPriceLevelText(recommendation.priceLevel)}
              </span>
              {recommendation.isSponsored && (
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-accent/30">
                  {recommendation.sponsorBadge}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onSaveToTrip?.(recommendation.id)}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Carousel */}
      <div className="relative h-48 overflow-hidden bg-muted/50">
        {recommendation.images.length > 0 && (
          <>
            <OptimizedImage
              src={recommendation.images[currentImageIndex]}
              alt={recommendation.title}
              width={600}
              height={400}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {recommendation.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md hover:bg-background/90"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md hover:bg-background/90"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {recommendation.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-foreground' : 'bg-foreground/40'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Promotion badge overlay */}
        {recommendation.promoText && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-accent text-accent-foreground border-accent/30">
              {recommendation.promoText}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {recommendation.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-body mb-3 line-clamp-2">
          {recommendation.description}
        </p>

        {/* Location and distance */}
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {recommendation.location}
          </span>
          {recommendation.distance && (
            <span className="text-xs text-muted-foreground ml-auto">
              {recommendation.distance}
            </span>
          )}
        </div>

        {/* User recommendations */}
        {recommendation.userRecommendations && (
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {recommendation.userRecommendations.count} people in your network loved this
            </span>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <Button
            className={`flex-1 ${
              recommendation.isSponsored 
                ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
            onClick={handleCTA}
          >
            {recommendation.ctaButton.text}
          </Button>
          <Button
            variant="outline"
            className="px-3"
            onClick={() => onSaveToTrip?.(recommendation.id)}
          >
            Save
          </Button>
        </div>

        {/* Sponsored disclosure */}
        {recommendation.isSponsored && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Promoted
          </p>
        )}
      </div>
    </Card>
  );
};