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
  Smile,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentInput } from '@/components/payments/PaymentInput';
import { useShareAsset } from '@/hooks/useShareAsset';
import { ParsedContentSuggestions } from './ParsedContentSuggestions';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchOGMetadata } from '@/services/ogMetadataService';
import { cn } from '@/lib/utils';
import { CTA_BUTTON, CTA_BUTTON_SM, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';
import * as haptics from '@/native/haptics';
import { MentionPicker, TripMember } from './MentionPicker';
import { VoiceButton } from './VoiceButton';
import { useWebSpeechVoice } from '@/hooks/useWebSpeechVoice';

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
  /** When true, hides file/media upload buttons (media_upload_mode enforcement) */
  disableFileUpload?: boolean;
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
  disableFileUpload = false,
}: ChatInputProps) => {
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [isPaymentMode, setIsPaymentMode] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Send-lock to prevent double submit
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrlInput, setShareUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @-mention state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<TripMember[]>([]);

  // Emoji picker state — lazily loaded on first open
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerData, setEmojiPickerData] = useState<any>(null);
  const [EmojiPickerComponent, setEmojiPickerComponent] = useState<React.ComponentType<any> | null>(
    null,
  );

  // Dictation (Web Speech API) — reuses the same hook as concierge
  const inputMessageRef = useRef(inputMessage);
  inputMessageRef.current = inputMessage;

  const handleDictationResult = useCallback(
    (text: string) => {
      if (text.trim()) {
        const prev = inputMessageRef.current;
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        onInputChange(prev + separator + text.trim());
      }
    },
    [onInputChange],
  );

  const { voiceState: dictationState, toggleVoice: toggleDictation } =
    useWebSpeechVoice(handleDictationResult);

  const loadEmojiPicker = useCallback(async () => {
    if (EmojiPickerComponent) return;
    const [pickerModule, dataModule] = await Promise.all([
      import('@emoji-mart/react'),
      import('@emoji-mart/data'),
    ]);
    const Picker = (pickerModule as any).default || (pickerModule as any).Picker;
    setEmojiPickerData(dataModule.default);
    setEmojiPickerComponent(() => Picker);
  }, [EmojiPickerComponent]);

  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        onInputChange(inputMessage + emoji.native);
        setShowEmojiPicker(false);
        return;
      }
      const start = textarea.selectionStart ?? inputMessage.length;
      const end = textarea.selectionEnd ?? inputMessage.length;
      const newValue = inputMessage.slice(0, start) + emoji.native + inputMessage.slice(end);
      onInputChange(newValue);
      // Restore cursor after inserted emoji
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + emoji.native.length;
        textarea.setSelectionRange(newPos, newPos);
      });
      setShowEmojiPicker(false);
    },
    [inputMessage, onInputChange],
  );

  const {
    shareLink,
    shareMultipleFiles,
    isUploading: isShareUploading,
    uploadProgress,
    parsedContent,
    clearParsedContent,
  } = useShareAsset(tripId);

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
    const url = shareUrlInput.trim();
    if (!url) return;

    try {
      await shareLink(url);
      setShareUrlInput('');
      setIsShareModalOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) {
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

          {/* Emoji Picker Button — desktop-first, lazy-loaded */}
          <Popover
            open={showEmojiPicker}
            onOpenChange={open => {
              setShowEmojiPicker(open);
              if (open) loadEmojiPicker();
            }}
          >
            <PopoverTrigger asChild>
              <button className={cn('hidden sm:flex', CTA_BUTTON_SM)} aria-label="Insert emoji">
                <Smile size={18} className="text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="p-0 w-auto border-0 bg-transparent shadow-none"
            >
              {EmojiPickerComponent && emojiPickerData ? (
                <EmojiPickerComponent
                  data={emojiPickerData}
                  onEmojiSelect={handleEmojiSelect}
                  theme="dark"
                  previewPosition="none"
                  skinTonePosition="none"
                />
              ) : (
                <div className="w-72 h-40 flex items-center justify-center bg-neutral-900 rounded-xl text-neutral-400 text-sm">
                  Loading emojis…
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Dictation Button — reuses concierge Web Speech API hook */}
          <VoiceButton
            voiceState={dictationState}
            isEligible={true}
            onToggle={toggleDictation}
            small
          />

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
                ? 'bg-white/5 border border-[#B91C1C]/50 focus-visible:ring-[#B91C1C]/40 backdrop-blur-sm text-white placeholder-red-800/80'
                : 'bg-white/5 border border-white/10 focus-visible:ring-primary/40 backdrop-blur-sm text-white placeholder-neutral-400',
            )}
          />

          {/* + Button with Dropdown Menu — right side */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={CTA_BUTTON} aria-label="Message options">
                <Plus size={CTA_ICON_SIZE} className="text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={8}
              className="w-52 p-1 bg-neutral-900/95 backdrop-blur-lg border border-neutral-800 rounded-xl shadow-lg animate-slide-in-right z-50"
            >
              {/* Broadcast - Deep Crimson Styling */}
              <DropdownMenuItem
                onClick={() => setIsBroadcastMode(!isBroadcastMode)}
                className="flex items-center gap-2 px-3 py-2 border border-[#B91C1C]/60 text-[#B91C1C] font-medium hover:bg-[#B91C1C] hover:text-white rounded-lg mb-1 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                Broadcast
              </DropdownMenuItem>

              {/* File — hidden when media uploads are restricted */}
              {!disableFileUpload && (
                <DropdownMenuItem
                  onClick={() => handleFileUpload('document')}
                  className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  File
                </DropdownMenuItem>
              )}

              {/* Link */}
              <DropdownMenuItem
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <Link className="w-4 h-4" />
                Link
              </DropdownMenuItem>

              {/* Photo — hidden when media uploads are restricted */}
              {!disableFileUpload && (
                <DropdownMenuItem
                  onClick={() => handleFileUpload('image')}
                  className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Photo
                </DropdownMenuItem>
              )}

              {/* Video — hidden when media uploads are restricted */}
              {!disableFileUpload && (
                <DropdownMenuItem
                  onClick={() => handleFileUpload('video')}
                  className="flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Video
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send Button — persistent gold rim; broadcast mode keeps orange gradient */}
          <button
            onClick={handleSend}
            disabled={
              (!inputMessage.trim() && !isShareUploading) ||
              isTyping ||
              isFetchingPreview ||
              isSendingMessage
            }
            className={
              isBroadcastMode
                ? cn(
                    'size-11 min-w-[44px] rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#B91C1C] to-[#991B1B] hover:opacity-90 shrink-0 select-none touch-manipulation',
                  )
                : CTA_BUTTON
            }
          >
            {isFetchingPreview ? (
              <Loader2 size={CTA_ICON_SIZE} className="text-white animate-spin" />
            ) : (
              <Send size={CTA_ICON_SIZE} className="text-white" />
            )}
          </button>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" className="hidden" multiple />
        </div>
      )}

      {/* Broadcast Mode Indicator */}
      {isBroadcastMode && !isPaymentMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#B91C1C]/10 border-t border-[#B91C1C]/30">
          <span className="text-xs text-[#B91C1C] flex items-center gap-2">
            <Megaphone size={14} />
            Broadcasting to all members
          </span>
          <button
            onClick={() => setIsBroadcastMode(false)}
            className="text-xs text-[#B91C1C] hover:text-[#B91C1C]/80 underline"
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

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="bg-gray-900 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Share a link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={shareUrlInput}
              onChange={e => setShareUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="w-full min-h-[88px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  setShareUrlInput('');
                }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkShare}
                disabled={!shareUrlInput.trim() || isShareUploading}
                className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                {isShareUploading ? 'Sharing…' : 'Share link'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
