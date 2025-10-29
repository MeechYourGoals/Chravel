
import React, { useState } from 'react';
import { ExternalLink, MessageCircle, ThumbsUp, MoreHorizontal, User } from 'lucide-react';
import { Button } from './ui/button';

interface LinkPost {
  id: string;
  title: string;
  url: string;
  description: string;
  source: 'chat' | 'manual' | 'places';
  imageUrl?: string;
  postedBy: string;
  postedAt: string;
  upvotes: number;
  comments: number;
}

interface LinkCardProps {
  link: LinkPost;
}

export const LinkCard = ({ link }: LinkCardProps) => {
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const getSourceBadge = (source: 'chat' | 'manual' | 'places') => {
    const sourceMap = {
      'chat': { label: 'From chat', color: 'bg-blue-600' },
      'places': { label: 'From Places', color: 'bg-green-600' },
      'manual': { label: 'Manual', color: 'bg-gray-600' }
    };
    return sourceMap[source];
  };

  const sourceBadge = getSourceBadge(link.source);

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-colors">
      {/* Link Preview */}
      <div className="flex">
        {link.imageUrl && (
          <div className="w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0">
            <img 
              src={link.imageUrl} 
              alt={link.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${sourceBadge.color}`}>
                {sourceBadge.label}
              </span>
            </div>
            <button className="text-slate-400 hover:text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
          
          <h3 className="text-white font-medium mb-1 line-clamp-2">{link.title}</h3>
          <p className="text-slate-400 text-sm mb-3 line-clamp-2">{link.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <User size={14} />
                {link.postedBy}
              </div>
              <span>{link.postedAt}</span>
            </div>
            
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              <ExternalLink size={14} />
              View
            </a>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsUpvoted(!isUpvoted)}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isUpvoted ? 'text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ThumbsUp size={16} className={isUpvoted ? 'fill-current' : ''} />
              {link.upvotes + (isUpvoted ? 1 : 0)}
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <MessageCircle size={16} />
              {link.comments}
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 bg-slate-900/20 border-t border-slate-700/30">
          <div className="text-sm text-slate-400 mb-3">
            Comments coming soon...
          </div>
        </div>
      )}
    </div>
  );
};
