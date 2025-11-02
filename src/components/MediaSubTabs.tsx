import React, { useState } from 'react';
import { Camera, Video, FileText, Link, Play, Download, MessageCircle, ExternalLink, Receipt, DollarSign, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { PaymentMethodIcon } from './receipts/PaymentMethodIcon';
import { generatePaymentDeeplink } from '../utils/paymentDeeplinks';
import { AddLinkModal } from './AddLinkModal';

interface MediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
  file_size?: number;
  mime_type?: string;
}

interface LinkItem {
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

interface MediaSubTabsProps {
  items: MediaItem[] | LinkItem[];
  type: 'photos' | 'videos' | 'files' | 'urls';
}

export const MediaSubTabs = ({ items, type }: MediaSubTabsProps) => {
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePaymentClick = (item: MediaItem) => {
    if (item.metadata?.preferredMethod && item.metadata?.perPersonAmount) {
      const deeplink = generatePaymentDeeplink(
        item.metadata.preferredMethod,
        item.metadata.perPersonAmount,
        'Trip Member'
      );
      
      if (deeplink) {
        window.open(deeplink, '_blank');
      }
    }
  };

  if (type === 'urls') {
    const linkItems = items as LinkItem[];

    return (
      <div className="space-y-4">
        {/* Header with Add URL Button */}
        <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-semibold text-foreground">
            All URLs ({linkItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddLinkModalOpen(true)}
            className="text-xs"
          >
            <Link className="w-4 h-4 mr-1" />
            + Add URL
          </Button>
        </div>

        {/* URLs Display */}
        {linkItems.length === 0 ? (
          <div className="text-center py-8">
            <Link className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              URLs shared in chat will appear here automatically
            </p>
          </div>
        ) : null}

        {/* URLs Display */}
        {linkItems.length > 0 && linkItems.map((item) => (
          <div key={item.id} className="bg-card border rounded-lg p-4 hover:bg-card/80 transition-colors">
            <div className="flex gap-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-foreground font-medium text-sm mb-1 truncate">{item.title}</h4>
                <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{item.domain}</span>
                    <span>{formatDate(item.created_at)}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.source === 'chat' ? 'From chat' : item.source === 'places' ? 'From Places' : 'Manual'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(item.url, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <AddLinkModal 
          isOpen={isAddLinkModalOpen}
          onClose={() => setIsAddLinkModalOpen(false)}
        />
      </div>
    );
  }

  const mediaItems = items as MediaItem[];

  // Grid layout for photos and videos with click-to-play videos
  if (type === 'photos' || type === 'videos') {
    return (
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            {type === 'photos' ? 'Photos' : 'Videos'} ({mediaItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const mediaType = type === 'photos' ? 'Photo' : 'Video';
              alert(`Add ${mediaType} functionality - would open file picker for ${type}`);
            }}
            className="text-xs"
          >
            {type === 'photos' ? <Camera className="w-4 h-4 mr-1" /> : <Video className="w-4 h-4 mr-1" />}
            + Add {type === 'photos' ? 'Photo' : 'Video'}
          </Button>
        </div>
        
        {mediaItems.length === 0 ? (
          <div className="text-center py-8">
            {type === 'photos' ? <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" /> : <Video className="mx-auto h-8 w-8 text-muted-foreground mb-2" />}
            <p className="text-muted-foreground text-sm">
              {type.charAt(0).toUpperCase() + type.slice(1)} shared in chat will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item) => (
            <div 
              key={item.id} 
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => {
                if (item.media_type === 'video') {
                  // Create a modal or overlay for video playback
                  const video = document.createElement('video');
                  video.src = item.media_url;
                  video.controls = true;
                  video.autoplay = true;
                  video.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;max-width:90vw;max-height:90vh;background:black;';
                  
                  const overlay = document.createElement('div');
                  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9998;display:flex;align-items:center;justify-content:center;';
                  overlay.onclick = () => document.body.removeChild(overlay);
                  
                  overlay.appendChild(video);
                  document.body.appendChild(overlay);
                }
              }}
            >
              {item.media_type === 'image' ? (
                <img
                  src={item.media_url}
                  alt={item.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={item.media_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  {item.metadata?.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(item.metadata.duration / 60)}:{(item.metadata.duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    {item.source === 'chat' ? (
                      <MessageCircle className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
                    )}
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium truncate">{item.filename}</p>
                  <p className="text-white/80 text-xs">
                    {item.source === 'chat' ? 'From chat' : 'Uploaded'} • {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Special handling for Files tab - show documents and file-type images
  if (type === 'files') {
    const fileItems = mediaItems.filter(item => 
      item.media_type === 'document' || 
      (item.media_type === 'image' && (item.metadata?.isSchedule || item.metadata?.isReceipt || item.metadata?.isTicket))
    );


    return (
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            Files ({fileItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              alert('Add File functionality - would open file picker for documents, receipts, schedules');
            }}
            className="text-xs"
          >
            <FileText className="w-4 h-4 mr-1" />
            + Add File
          </Button>
        </div>
        
        {fileItems.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              Documents, receipts, and schedules shared in chat will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fileItems.map((item: MediaItem) => (
            <div key={item.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.metadata?.isReceipt ? (
                    <div className="flex-shrink-0">
                      <img
                        src={item.media_url}
                        alt={item.filename}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  ) : item.metadata?.isSchedule ? (
                    <div className="flex-shrink-0">
                      <img
                        src={item.media_url}
                        alt={item.filename}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <FileText className="text-blue-400" size={20} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium truncate">{item.filename}</p>
                      {item.metadata?.isReceipt && (
                        <Badge variant="outline" className="text-green-400 border-green-400/50">
                          Receipt
                        </Badge>
                      )}
                      {item.metadata?.isTicket && (
                        <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                          Ticket
                        </Badge>
                      )}
                      {item.metadata?.isSchedule && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                          Schedule
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span>{item.source === 'chat' ? 'From chat' : 'Uploaded'}</span>
                      <span>{formatDate(item.created_at)}</span>
                      {item.metadata?.extractedEvents && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                          {item.metadata.extractedEvents} events
                        </Badge>
                      )}
                    </div>

                    {/* Receipt-specific info */}
                    {item.metadata?.isReceipt && item.metadata?.totalAmount && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-400" />
                          <span className="text-foreground text-sm font-medium">
                            ${item.metadata.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        
                        {item.metadata.splitCount && item.metadata.perPersonAmount && (
                          <div className="flex items-center gap-1">
                            <Users size={14} className="text-blue-400" />
                            <span className="text-muted-foreground text-sm">
                              ${item.metadata.perPersonAmount.toFixed(2)} each ({item.metadata.splitCount} people)
                            </span>
                          </div>
                        )}
                        
                        {item.metadata.preferredMethod && (
                          <div className="flex items-center gap-2">
                            <PaymentMethodIcon method={item.metadata.preferredMethod} size={14} />
                            <span className="text-muted-foreground text-sm capitalize">
                              {item.metadata.preferredMethod}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Receipt payment button */}
                  {item.metadata?.isReceipt && item.metadata?.perPersonAmount && (
                    <Button
                      onClick={() => handlePaymentClick(item)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      Pay ${item.metadata.perPersonAmount.toFixed(2)}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.media_url, '_blank')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Download size={16} />
                  </Button>
                </div>
              </div>
            </div>
            ))}
          </div>
      )}
    </div>
  );
};
};