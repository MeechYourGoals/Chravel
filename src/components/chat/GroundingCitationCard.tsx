import React from 'react';
import { ExternalLink, MapPin, CheckCircle } from 'lucide-react';
import { GroundingCitation } from '@/types/grounding';
import { generateStaticMapUrl } from '@/utils/mapThumbnail';
import { cn } from '@/lib/utils';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';

interface GroundingCitationCardProps {
  citation: GroundingCitation;
  index: number;
}

export const GroundingCitationCard = ({ citation, index }: GroundingCitationCardProps) => {
  const isMobilePortrait = useMobilePortrait();
  const isGoogleMaps = citation.source === 'google_maps_grounding';
  
  // Generate thumbnail if coordinates available
  const thumbnailUrl = citation.thumbnailUrl || 
    (citation.coordinates ? generateStaticMapUrl(citation.coordinates, 100, 80) : null);

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200 hover:scale-[1.02]",
        isMobilePortrait ? "p-2" : "p-3"
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="flex-shrink-0">
            <img 
              src={thumbnailUrl} 
              alt={citation.title}
              className={cn(
                "rounded object-cover border border-white/10",
                isMobilePortrait ? "w-16 h-12" : "w-24 h-18"
              )}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Title + Badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-white line-clamp-1",
              isMobilePortrait ? "text-xs" : "text-sm"
            )}>
              {citation.title}
            </h4>
            
            {isGoogleMaps && (
              <span className={cn(
                "flex items-center gap-1 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0",
                isMobilePortrait ? "text-[9px]" : "text-[10px]"
              )}>
                <CheckCircle size={isMobilePortrait ? 10 : 12} />
                Verified
              </span>
            )}
          </div>
          
          {/* Distance + Place Type */}
          {(citation.distanceFromBasecamp || citation.placeType) && (
            <div className={cn(
              "flex items-center gap-2 mb-1 text-gray-400",
              isMobilePortrait ? "text-[10px]" : "text-xs"
            )}>
              {citation.distanceFromBasecamp && (
                <span className="flex items-center gap-1">
                  <MapPin size={isMobilePortrait ? 10 : 12} className="text-green-400" />
                  {citation.distanceFromBasecamp.value.toFixed(1)} {citation.distanceFromBasecamp.unit} away
                </span>
              )}
              {citation.placeType && (
                <span className="capitalize">• {citation.placeType}</span>
              )}
            </div>
          )}
          
          {/* Snippet */}
          <p className={cn(
            "text-gray-300 line-clamp-2",
            isMobilePortrait ? "text-[10px]" : "text-xs"
          )}>
            {citation.snippet}
          </p>
          
          {/* Footer: External Link */}
          <div className={cn(
            "flex items-center gap-1 text-blue-400 mt-1",
            isMobilePortrait ? "text-[9px]" : "text-[10px]"
          )}>
            <ExternalLink size={isMobilePortrait ? 8 : 10} />
            <span>Open in Google Maps</span>
          </div>
        </div>
      </div>
    </a>
  );
};
