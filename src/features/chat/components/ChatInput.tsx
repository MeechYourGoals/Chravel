import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  Megaphone,
  Link,
  Camera,
  Video,
  FileText,
  Loader2,
  Upload,
  Image,
  Film,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentInput } from '@/components/payments/PaymentInput';
import { useShareAsset } from '@/hooks/useShareAsset';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { ParsedContentSuggestions } from './ParsedContentSuggestions';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { fetchOGMetadata } from '@/services/ogMetadataService';
import { cn } from '@/lib/utils';
import * as haptics from '@/native/haptics';
import { MentionPicker, TripMember } from './MentionPicker';

// URL detection regex
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
}

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: (
    isBroadcast?: boolean,
    isPayment?: boolean,
    paymentData?: any,
    linkPreview?: any,
    mentionedUserIds?: string[],
  ) => void;
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
  /**
   * Adds extra bottom padding equal to the iOS safe-area inset so the composer
   * never overlaps the home-indicator gesture area when embedded without a wrapper.
   *
   * Set to `false` if the parent already applies `pb-[env(safe-area-inset-bottom)]`.
   */
  safeAreaBottom?: boolean;
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
  onTypingChange,
  safeAreaBottom = true,
}: ChatInputProps) => {
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [isPaymentMode, setIsPaymentMode] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Send-lock to prevent double submit
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @-mention state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<TripMember[]>([]);

  const {
    shareFile,
    shareLink,
    shareMultipleFiles,
    isUploading: isShareUploading,
    uploadProgress,
    parsedContent,
    clearParsedContent,
  } = useShareAsset(tripId);

  const {
    uploadFiles,
    uploadQueue,
    isUploading: isMediaUploading,
    clearQueue,
  } = useMediaUpload({
    tripId,
    onComplete: () => {
      // Upload complete - no action needed, message will be sent with attachment
    },
    onError: (error, fileName) => {
      toast.error(`Failed to upload ${fileName}: ${error.message}`);
      void haptics.error();
    },
  });

  // Track typing status
  useEffect(() => {
    if (onTypingChange) {
      const hasText = inputMessage.trim().length > 0;
      onTypingChange(hasText);
    }
  }, [inputMessage, onTypingChange]);

  // Handle @ mention detection
  const handleInputChange = useCallback(
    (value: string) => {
      onInputChange(value);

      // Check for @ trigger
      const cursorPosition = textareaRef.current?.selectionStart || value.length;
      const textBeforeCursor = value.slice(0, cursorPosition);

      // Find the last @ before cursor
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Check if @ is at start or preceded by whitespace
        const charBefore = textBeforeCursor[lastAtIndex - 1];
        if (lastAtIndex === 0 || charBefore === ' ' || charBefore === '\n') {
          const searchText = textBeforeCursor.slice(lastAtIndex + 1);
          // Only show picker if no space after @
          if (!searchText.includes(' ')) {
            setShowMentionPicker(true);
            setMentionSearchQuery(searchText);
            setMentionStartIndex(lastAtIndex);
            return;
          }
        }
      }

      setShowMentionPicker(false);
      setMentionSearchQuery('');
      setMentionStartIndex(null);
    },
    [onInputChange],
  );

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (member: TripMember) => {
      if (mentionStartIndex === null) return;

      // Replace @query with @Name
      const beforeMention = inputMessage.slice(0, mentionStartIndex);
      const cursorPosition = textareaRef.current?.selectionStart || inputMessage.length;
      const afterCursor = inputMessage.slice(cursorPosition);

      const newMessage = `${beforeMention}@${member.name} ${afterCursor}`;
      onInputChange(newMessage);

      // Add to mentioned users if not already there
      if (!mentionedUsers.find(u => u.id === member.id)) {
        setMentionedUsers(prev => [...prev, member]);
      }

      // Close picker
      setShowMentionPicker(false);
      setMentionSearchQuery('');
      setMentionStartIndex(null);
      setSelectedMentionIndex(0);

      // Haptic feedback
      haptics.light();

      // Focus back on input
      textareaRef.current?.focus();
    },
    [inputMessage, mentionStartIndex, onInputChange, mentionedUsers],
  );

  // Handle keyboard navigation in mention picker
  const handleMentionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showMentionPicker) return;

      const filteredMembers = tripMembers.filter(m =>
        m.name.toLowerCase().includes(mentionSearchQuery.toLowerCase()),
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev < filteredMembers.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev > 0 ? prev - 1 : filteredMembers.length - 1));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const selectedMember = filteredMembers[selectedMentionIndex];
        if (selectedMember) {
          handleMentionSelect(selectedMember);
        }
      } else if (e.key === 'Escape') {
        setShowMentionPicker(false);
        setMentionSearchQuery('');
        setMentionStartIndex(null);
      }
    },
    [showMentionPicker, tripMembers, mentionSearchQuery, selectedMentionIndex, handleMentionSelect],
  );

  const handleSend = async () => {
    // Prevent double-submit while request is in-flight
    if (isSendingMessage) {
      if (import.meta.env.DEV) {
        console.warn('[ChatInput] Send blocked - already sending');
      }
      return;
    }

    if (!isPaymentMode) {
      // Early validation - don't start send flow if no content
      if (!inputMessage.trim()) return;

      setIsSendingMessage(true);
      onTypingChange?.(false);

      try {
        // Check for URL and fetch OG metadata
        const url = extractFirstUrl(inputMessage);
        let linkPreview = null;

        if (url) {
          setIsFetchingPreview(true);
          try {
            const metadata = await fetchOGMetadata(url);
            if (metadata && !metadata.error) {
              linkPreview = {
                url,
                title: metadata.title,
                description: metadata.description,
                image: metadata.image,
                domain: new URL(url).hostname.replace('www.', ''),
              };
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Failed to fetch OG metadata:', error);
            }
          } finally {
            setIsFetchingPreview(false);
          }
        }

        // Extract mentioned user IDs
        const mentionedUserIds = mentionedUsers.map(u => u.id);

        onSendMessage(isBroadcastMode, false, undefined, linkPreview, mentionedUserIds);

        // Clear mentioned users after send
        setMentionedUsers([]);
      } finally {
        // Release send-lock after a short delay to prevent rapid re-clicks
        setTimeout(() => setIsSendingMessage(false), 300);
      }
    }
  };

  const handlePaymentSubmit = (paymentData: any) => {
    onSendMessage(false, true, paymentData);
    setIsPaymentMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle mention picker keyboard navigation first
    if (showMentionPicker) {
      handleMentionKeyDown(e);
      return;
    }

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
      document: '.pdf,.doc,.docx,.txt,.xlsx,.pptx',
    };

    fileInputRef.current.accept = accept[type];
    fileInputRef.current.onchange = async e => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Use new upload hook with progress tracking
        await uploadFiles(files);

        // Also share to chat (legacy flow)
        await shareMultipleFiles(files, type);

        if (onFileUpload) {
          onFileUpload(files, type);
        }
      }
    };
    fileInputRef.current.click();
  };

  // Drag and drop handlers with visual feedback
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set inactive if leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Use new upload hook with progress tracking
      await uploadFiles(files);

      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const type = isImage ? 'image' : isVideo ? 'video' : 'document';

      // Also share to chat (legacy flow)
      await shareMultipleFiles(files, type);
      if (onFileUpload) {
        onFileUpload(files, type);
      }
    }
  };

  const handleLinkShare = async () => {
    const url = prompt('Paste the link you want to share:');
    if (url && url.trim()) {
      try {
        await shareLink(url.trim());
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to share link:', error);
        }
      }
    }
  };

  // Detect file type from drag event
  const getFileTypeFromDrag = (e: React.DragEvent): 'image' | 'video' | 'document' | 'mixed' => {
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return 'document';

    let hasImage = false;
    let hasVideo = false;
    let hasDocument = false;

    for (let i = 0; i < items.length; i++) {
      const type = items[i].type;
      if (type.startsWith('image/')) hasImage = true;
      else if (type.startsWith('video/')) hasVideo = true;
      else hasDocument = true;
    }

    if (hasImage && !hasVideo && !hasDocument) return 'image';
    if (hasVideo && !hasImage && !hasDocument) return 'video';
    if (hasDocument && !hasImage && !hasVideo) return 'document';
    return 'mixed';
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
          ref={dropZoneRef}
          className={cn(
            'chat-composer flex items-center gap-2 px-3 py-2 bg-neutral-950/90 backdrop-blur-md sticky bottom-0 relative transition-all duration-200 w-full rounded-xl border border-white/10',
            isDragActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
          style={safeAreaBottom ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragActive && (
            <div className="absolute inset-0 z-20 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
              <Upload className="w-8 h-8 text-primary animate-bounce" />
              <p className="text-primary font-medium text-sm">Drop files here</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Image className="w-4 h-4" /> Photos
                </span>
                <span className="flex items-center gap-1">
                  <Film className="w-4 h-4" /> Videos
                </span>
                <span className="flex items-center gap-1">
                  <File className="w-4 h-4" /> Documents
                </span>
              </div>
            </div>
          )}

          {/* + Button with Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 transition-all"
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

          {/* Mention Picker */}
          {showMentionPicker && tripMembers.length > 0 && (
            <MentionPicker
              members={tripMembers}
              searchQuery={mentionSearchQuery}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionPicker(false)}
              selectedIndex={selectedMentionIndex}
              onSelectedIndexChange={setSelectedMentionIndex}
            />
          )}

          {/* Message Input */}
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isBroadcastMode ? 'Send an announcement...' : 'Type @ to mention someone…'}
            rows={1}
            className={cn(
              'flex-1 min-h-[44px] sm:min-h-[48px] px-4 py-2 rounded-full resize-none focus:outline-none focus-visible:ring-2 transition-all',
              isBroadcastMode
                ? 'bg-white/5 border border-orange-500/50 focus-visible:ring-orange-500/40 backdrop-blur-sm text-white placeholder-red-800/80'
                : 'bg-white/5 border border-white/10 focus-visible:ring-blue-500/40 backdrop-blur-sm text-white placeholder-neutral-400',
            )}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={
              (!inputMessage.trim() && !isMediaUploading && !isShareUploading) ||
              isTyping ||
              isFetchingPreview ||
              isSendingMessage
            }
            className={cn(
              'size-10 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center',
              isBroadcastMode
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90',
            )}
          >
            {isFetchingPreview ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" className="hidden" multiple />
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

      {/* Upload Progress Indicators - Legacy Share Hook */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="space-y-2 px-3">
          {Object.values(uploadProgress).map(progress => (
            <div key={progress.fileId} className="flex items-center gap-2 text-sm">
              <div className="flex-1 bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    progress.status === 'completed'
                      ? 'bg-green-500'
                      : progress.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500',
                  )}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <span className="text-neutral-400 text-xs truncate max-w-[150px]">
                {progress.fileName}
              </span>
              {progress.status === 'completed' && <span className="text-green-500 text-xs">✓</span>}
              {progress.status === 'error' && <span className="text-red-500 text-xs">✗</span>}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress Indicators - New Media Hook */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 px-4 py-3 bg-background/50 backdrop-blur-sm rounded-lg border border-white/10">
          {uploadQueue.map(item => (
            <div key={item.fileId} className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80 truncate max-w-[200px]">{item.fileName}</span>
                  <span className="text-foreground/60">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
              {item.status === 'complete' && <span className="text-green-500 text-sm">✓</span>}
              {item.status === 'error' && <span className="text-red-500 text-sm">✗</span>}
              {item.status === 'uploading' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
