import React, { useState, useRef } from 'react';
import { Send, MapPin, Languages, Calendar, Image, X } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RecipientSelector } from './broadcast/RecipientSelector';
import { BroadcastScheduler } from './broadcast/BroadcastScheduler';
import { broadcastService } from '../services/broadcastService';
import { toast } from 'sonner';
import { useBroadcastComposer } from '@/hooks/useBroadcastComposer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Participant {
  id: string | number;
  name: string;
  role: string;
}

interface BroadcastComposerProps {
  participants: Participant[];
  tripTier?: 'consumer' | 'pro' | 'event';
  tripId: string;
  onSend?: (broadcast: {
    message: string;
    location?: string;
    category: 'chill' | 'logistics' | 'urgent';
    recipients: string;
  }) => void;
}

export const BroadcastComposer = ({
  participants,
  tripTier = 'consumer',
  tripId,
  onSend,
}: BroadcastComposerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const {
    message,
    location,
    category,
    recipient,
    translateTo,
    showDetails,
    characterCount,
    maxCharacters,
    setMessage,
    setLocation,
    setCategory,
    setRecipient,
    setTranslateTo,
    setShowDetails,
    resetForm,
    getCategoryColor,
  } = useBroadcastComposer();

  const languages = [
    { code: 'none', name: 'No Translation' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
  ];

  // Reserved for role-based targeting in enterprise broadcasts
  const _roleOptions = Array.from(new Set(participants.map(p => p.role)));
  const isConsumerTrip = tripTier === 'consumer';

  const handleFileUpload = async (files: FileList) => {
    if (!user || !files.length) return;

    setUploadingAttachments(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/quicktime',
        ];
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name} is not a supported file type`);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `broadcasts/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-files')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('trip-files').getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setAttachments(prev => [...prev, ...uploadedUrls]);
        toast.success(`Uploaded ${uploadedUrls.length} file(s)`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const broadcastData = {
        trip_id: tripId,
        message: message.trim(),
        priority:
          category === 'chill'
            ? ('fyi' as const)
            : category === 'logistics'
              ? ('reminder' as const)
              : ('urgent' as const),
        scheduled_for: scheduledFor ? scheduledFor.toISOString() : undefined,
        attachment_urls: attachments.length > 0 ? attachments : undefined,
        metadata: {
          location: location.trim() || undefined,
          recipients: recipient,
          translateTo: translateTo !== 'none' ? translateTo : undefined,
        },
      };

      const newBroadcast = await broadcastService.createBroadcast(broadcastData);

      if (newBroadcast) {
        // Trigger push notification for urgent/reminder broadcasts if sent immediately
        if (!scheduledFor && (category === 'urgent' || category === 'logistics')) {
          try {
            await broadcastService.sendPushNotification(newBroadcast.id, tripId);
          } catch (error) {
            console.error('Failed to send push notification:', error);
            // Don't fail the broadcast creation if push fails
          }
        }

        toast.success(
          scheduledFor ? 'Broadcast scheduled successfully!' : 'Broadcast sent successfully!',
        );

        // Call the optional onSend callback for any additional handling
        onSend?.({
          message: message.trim(),
          location: location.trim() || undefined,
          category,
          recipients: recipient,
        });

        // Reset form
        resetForm();
        setScheduledFor(null);
        setShowScheduler(false);
        setAttachments([]);
      } else {
        toast.error('Failed to send broadcast. Please try again.');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Send size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Share an update with the group..."
            maxLength={140}
            rows={2}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
          />

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((url, index) => (
                <div key={index} className="relative group">
                  {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="h-20 w-20 object-cover rounded border border-slate-600"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-slate-700 rounded border border-slate-600 flex items-center justify-center">
                      <span className="text-xs text-slate-400">Video</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove attachment"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
              >
                <MapPin size={14} />
                Add details
              </button>
              <button
                onClick={() => setShowScheduler(!showScheduler)}
                className={`text-slate-400 hover:text-white text-sm flex items-center gap-1 ${
                  scheduledFor ? 'text-blue-400' : ''
                }`}
              >
                <Calendar size={14} />
                Schedule
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachments}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Image size={14} />
                {uploadingAttachments ? 'Uploading...' : 'Attach'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={e => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              {!isConsumerTrip && (
                <div className="flex items-center gap-2 ml-4">
                  <Languages size={14} className="text-slate-400" />
                  <Select value={translateTo} onValueChange={setTranslateTo}>
                    <SelectTrigger className="w-32 h-6 bg-slate-700 border-slate-600 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code} className="text-xs">
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <span className="text-xs text-slate-500">
                {characterCount}/{maxCharacters}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Recipient selector - only for Pro/Event trips */}
              <RecipientSelector
                participants={participants}
                recipient={recipient}
                onRecipientChange={setRecipient}
                isConsumerTrip={isConsumerTrip}
              />

              {/* Category selector - only for Pro/Event trips */}
              {!isConsumerTrip && (
                <div className="flex gap-1">
                  {(['chill', 'logistics', 'urgent'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        category === cat
                          ? `${getCategoryColor(cat)} text-white`
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2"
              >
                {isLoading ? 'Sending...' : 'Broadcast'}
              </Button>
            </div>
          </div>

          {/* Additional details */}
          {showDetails && (
            <div className="mt-3 space-y-2">
              <label htmlFor="broadcast-location" className="sr-only">
                Location (optional)
              </label>
              <input
                id="broadcast-location"
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Scheduler */}
          {showScheduler && (
            <BroadcastScheduler
              scheduledFor={scheduledFor}
              onScheduleChange={setScheduledFor}
              onCancel={() => setShowScheduler(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
