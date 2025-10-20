import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Tag } from 'lucide-react';
import { Campaign } from '@/types/advertiser';

interface CampaignPreviewProps {
  campaign: Partial<Campaign>;
  className?: string;
}

export const CampaignPreview = ({ campaign, className = '' }: CampaignPreviewProps) => {
  const defaultImage = '/placeholder.svg';
  const firstImage = campaign.images?.[0]?.url || defaultImage;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
      {/* Image Carousel Placeholder */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={firstImage}
          alt={campaign.name || 'Campaign preview'}
          className="w-full h-full object-cover"
        />
        {campaign.discount_details && (
          <Badge className="absolute top-3 right-3 bg-green-600 text-white">
            {campaign.discount_details}
          </Badge>
        )}
        {/* Promoted Tag */}
        <Badge className="absolute top-3 left-3 bg-purple-600 text-white">
          Promoted
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">
          {campaign.name || 'Campaign Name'}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {campaign.description || 'Your campaign description will appear here...'}
        </p>

        {/* Destination Info */}
        {campaign.destination_info && (campaign.destination_info.city || campaign.destination_info.country) && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <MapPin className="h-4 w-4" />
            <span>
              {[campaign.destination_info.city, campaign.destination_info.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}

        {/* Tags */}
        {campaign.tags && campaign.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {campaign.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {campaign.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{campaign.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Action Buttons (matching trip card style) */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <button className="text-purple-600 hover:text-purple-700 font-medium text-sm">
            View Details
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Book Now
          </button>
        </div>
      </CardContent>
    </Card>
  );
};