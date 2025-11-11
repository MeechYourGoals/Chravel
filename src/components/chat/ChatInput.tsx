
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Megaphone, Share2, Image, Video, FileText, Mic, CreditCard, Link, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PaymentInput } from '../payments/PaymentInput';
import { useShareAsset } from '@/hooks/useShareAsset';
import { ParsedContentSuggestions } from './ParsedContentSuggestions';
import { toast } from 'sonner';

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: (isBroadcast?: boolean, isPayment?: boolean, paymentData?: any) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onFileUpload?: (files: FileList, type: 'image' | 'video' | 'document') => void;
  apiKey: string; // Keep for backward compatibility but won't be used
  isTyping: boolean;
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>;
  hidePayments?: boolean;
  isInChannelMode?: boolean; // 🆕 Flag to indicate we're in a role channel
  isPro?: boolean; // 🆕 Flag for pro/enterprise trips
  tripId: string; // Add tripId for asset sharing
  onTypingChange?: (isTyping: boolean) => void; // Callback for typing indicator
}

export const ChatInput = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onFileUpload,
  isTyping,
  tripMembers = [],
  hidePayments = false,
  isInChannelMode = false,
  isPro = false,
  tripId,
  onTypingChange
}: ChatInputProps) => {
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [isPaymentMode, setIsPaymentMode] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isModeRowExpanded, setIsModeRowExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    shareFile, 
    shareLink, 
    shareMultipleFiles, 
    isUploading, 
    uploadProgress,
    parsedContent,
    clearParsedContent
  } = useShareAsset(tripId);

  // Track typing status
  useEffect(() => {
    if (onTypingChange) {
      const hasText = inputMessage.trim().length > 0;
      onTypingChange(hasText);
    }
  }, [inputMessage, onTypingChange]);

  const handleSend = () => {
    if (!isPaymentMode) {
      onTypingChange?.(false);
      onSendMessage(isBroadcastMode, false);
    }
  };

  const handlePaymentSubmit = (paymentData: any) => {
    onSendMessage(false, true, paymentData);
    setIsPaymentMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      onKeyPress(e);
    }
  };

  const handleFileUpload = async (type: 'image' | 'video' | 'document') => {
    if (!fileInputRef.current) return;
    
    const accept = {
      image: 'image/*',
      video: 'video/*',
      document: '.pdf,.doc,.docx,.txt,.xlsx,.pptx'
    };
    
    fileInputRef.current.accept = accept[type];
    fileInputRef.current.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Use the new share asset functionality
        await shareMultipleFiles(files, type);
        
        // Also call the legacy callback if provided
        if (onFileUpload) {
          onFileUpload(files, type);
        }
      }
    };
    fileInputRef.current.click();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Determine file type based on first file
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const type = isImage ? 'image' : isVideo ? 'video' : 'document';
      
      // Use the new share asset functionality
      await shareMultipleFiles(files, type);
      
      // Also call the legacy callback if provided
      if (onFileUpload) {
        onFileUpload(files, type);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleLinkShare = async () => {
    const url = prompt('Paste the link you want to share:');
    if (url && url.trim()) {
      try {
        await shareLink(url.trim());
      } catch (error) {
        console.error('Failed to share link:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Parsed Content Suggestions */}
      {parsedContent && (
        <ParsedContentSuggestions
          parsedContent={parsedContent}
          tripId={tripId}
          onDismiss={clearParsedContent}
          onSuggestionApplied={clearParsedContent}
        />
      )}
      
      {/* Collapsible Mode Row */}
      <div className="border-b border-neutral-800/50 mode-row-transition">
        {isModeRowExpanded ? (
          <div className="flex items-center justify-center gap-3 px-4 py-2">
            <button
              onClick={() => {
                setIsBroadcastMode(false);
                setIsPaymentMode(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !isBroadcastMode && !isPaymentMode
                  ? 'bg-blue-600 text-white' 
                  : 'border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <MessageCircle size={14} />
              {isInChannelMode ? 'Chat' : 'Group Chat'}
            </button>
            <button
              onClick={() => {
                setIsBroadcastMode(true);
                setIsPaymentMode(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isBroadcastMode 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' 
                  : 'border border-orange-600 text-orange-400 hover:text-white hover:bg-orange-600/10'
              }`}
            >
              <Megaphone size={14} />
              Broadcast
            </button>
            
            {/* Share Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                  aria-label="Share media, files, or links"
                >
                  <Share2 size={14} />
                  Share
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-50 bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={() => handleFileUpload('image')}>
                  <Image className="w-4 h-4 mr-2" />
                  Photo/Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileUpload('video')}>
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileUpload('document')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLinkShare}>
                  <Link className="w-4 h-4 mr-2" />
                  Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button 
              onClick={() => setIsModeRowExpanded(false)} 
              className="ml-auto text-neutral-400 hover:text-white p-1 transition-colors"
              aria-label="Collapse mode selector"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="text-xs text-neutral-400 flex items-center gap-2">
              {isBroadcastMode ? (
                <>
                  <Megaphone size={14} className="text-orange-400" />
                  Broadcast
                </>
              ) : (
                <>
                  <MessageCircle size={14} className="text-blue-400" />
                  {isInChannelMode ? 'Chat' : 'Group Chat'}
                </>
              )}
            </span>
            <button 
              onClick={() => setIsModeRowExpanded(true)}
              className="text-neutral-400 hover:text-white p-1 transition-colors"
              aria-label="Expand mode selector"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Payment Input Form */}
      {isPaymentMode && (
        <PaymentInput
          onSubmit={handlePaymentSubmit}
          tripMembers={tripMembers}
          isVisible={isPaymentMode}
          tripId={tripId}
        />
      )}

      {/* Composer Row - Input and Send Button Only */}
      {!isPaymentMode && (
        <div 
          className="flex gap-3 items-end"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <textarea
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isBroadcastMode 
                ? "Send an announcement..." 
                : "Type a message…"
            }
            rows={1}
            className={`flex-1 border rounded-2xl px-3 py-2 focus:outline-none resize-none transition-all min-h-[44px] sm:min-h-[48px] ${
              isBroadcastMode
                ? 'bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/50 focus:border-orange-400 text-white placeholder-white/60'
                : 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white placeholder-gray-500'
            }`}
          />
          <button
            onClick={handleSend}
            disabled={(!inputMessage.trim() && !isUploading) || isTyping}
            className={`text-white p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isBroadcastMode
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            <Send size={18} />
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
          />
        </div>
      )}

      {/* Upload Progress Indicators */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="space-y-2 mt-2">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.fileId} className="flex items-center gap-2 text-sm">
              <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress.status === 'completed'
                      ? 'bg-green-500'
                      : progress.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs truncate max-w-[150px]">
                {progress.fileName}
              </span>
              {progress.status === 'completed' && (
                <span className="text-green-500 text-xs">✓</span>
              )}
              {progress.status === 'error' && (
                <span className="text-red-500 text-xs">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
