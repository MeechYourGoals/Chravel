import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkItemData {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual' | 'places';
  tags?: string[];
}

interface LinksListProps {
  items: LinkItemData[];
  maxItems?: number;
}

export const LinksList = ({ items, maxItems }: LinksListProps) => {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayItems.map(link => (
          <div
            key={link.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-white/10 p-3 flex flex-col"
          >
            {link.image_url ? (
              <img
                src={link.image_url}
                alt={link.title}
                className="w-full flex-1 object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full flex-1 bg-white/5 rounded mb-2 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="text-xs">
              <p className="text-white font-medium truncate">{link.title}</p>
              <p className="text-gray-400 text-xs">{link.domain}</p>
            </div>
          </div>
        ))}
      </div>
      {maxItems && items.length > maxItems && (
        <p className="text-center text-gray-400 text-sm">
          Showing {maxItems} of {items.length} links
        </p>
      )}
    </div>
  );
};
