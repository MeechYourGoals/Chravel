
import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Megaphone, Link, Image, Camera, Video, FileText } from 'lucide-react';
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
  apiKey: string;
  isTyping: boolean;
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>;
  hidePayments?: boolean;
  isInChannelMode?: boolean;
  isPro?: boolean;
  tripId: string;
  onTypingChange?: (isTyping: boolean) => void;
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
        await shareMultipleFiles(files, type);
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
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const type = isImage ? 'image' : isVideo ? 'video' : 'document';
      
      await shareMultipleFiles(files, type);
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
    <div className="space-y-2">
      {/* Parsed Content Suggestions */}
      {parsedContent && (
        <ParsedContentSuggestions
          parsedContent={parsedContent}
          tripId={tripId}
          onDismiss={clearParsedContent}
          onSuggestionApplied={clearParsedContent}
        />
      )}

      {/* Payment Input Form */}
      {isPaymentMode && (
        <PaymentInput
          onSubmit={handlePaymentSubmit}
          tripMembers={tripMembers}
          isVisible={isPaymentMode}
          tripId={tripId}
        />
      )}

      {/* Composer Row with + Button */}
      {!isPaymentMode && (
        <div 
          className="flex items-center gap-2 px-3 py-2 bg-neutral-950/90 backdrop-blur-md sticky bottom-0"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* + Button with Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-all"
                aria-label="Message options"
              >
                <Plus className="w-5 h-5 text-neutral-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top" 
              align="start"
              sideOffset={8}
              className="w-52 p-1 bg-neutral-900/95 backdrop-blur-lg border border-neutral-800 rounded-xl shadow-lg animate-slide-in-right z-50"
            >
              {/* Broadcast - Special Orange Styling */}
              <DropdownMenuItem 
                onClick={() => setIsBroadcastMode(!isBroadcastMode)}
                className="flex items-center gap-2 px-3 py-2 border border-orange-500/60 text-orange-400 font-medium hover:bg-orange-500/10 rounded-lg mb-1 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                Broadcast
              </DropdownMenuItem>
              
              {/* File */}
              <DropdownMenuItem 
                onClick={() => handleFileUpload('document')}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                File
              </DropdownMenuItem>
              
              {/* Image */}
              <DropdownMenuItem 
                onClick={() => handleFileUpload('image')}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <Image className="w-4 h-4" />
                Image
              </DropdownMenuItem>
              
              {/* Link */}
              <DropdownMenuItem 
                onClick={handleLinkShare}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <Link className="w-4 h-4" />
                Link
              </DropdownMenuItem>
              
              {/* Photo */}
              <DropdownMenuItem 
                onClick={() => handleFileUpload('image')}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Photo
              </DropdownMenuItem>
              
              {/* Video */}
              <DropdownMenuItem 
                onClick={() => handleFileUpload('video')}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message Input */}
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
            className={`flex-1 min-h-[44px] sm:min-h-[48px] px-4 py-2 rounded-full resize-none focus:outline-none focus-visible:ring-2 transition-all ${
              isBroadcastMode
                ? 'bg-white/5 border border-orange-500/50 focus-visible:ring-orange-500/40 backdrop-blur-sm text-white placeholder-red-800/80'
                : 'bg-white/5 border border-white/10 focus-visible:ring-blue-500/40 backdrop-blur-sm text-white placeholder-neutral-400'
            }`}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!inputMessage.trim() && !isUploading) || isTyping}
            className={`size-10 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              isBroadcastMode
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90'
            }`}
          >
            <Send size={18} className="text-white" />
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

      {/* Broadcast Mode Indicator */}
      {isBroadcastMode && !isPaymentMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-orange-500/10 border-t border-orange-500/30">
          <span className="text-xs text-orange-400 flex items-center gap-2">
            <Megaphone size={14} />
            Broadcasting to all members
          </span>
          <button 
            onClick={() => setIsBroadcastMode(false)}
            className="text-xs text-orange-400 hover:text-orange-300 underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload Progress Indicators */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="space-y-2 px-3">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.fileId} className="flex items-center gap-2 text-sm">
              <div className="flex-1 bg-neutral-700 rounded-full h-2 overflow-hidden">
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
              <span className="text-neutral-400 text-xs truncate max-w-[150px]">
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
