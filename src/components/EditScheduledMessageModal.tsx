import React, { useState } from 'react';
import { Calendar, Clock, Save, X } from 'lucide-react';
import { unifiedMessagingService } from '../services/unifiedMessagingService';
import { ScheduledMessage } from '../types/messaging';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface EditScheduledMessageModalProps {
  message: ScheduledMessage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedMessage: ScheduledMessage) => void;
}

export const EditScheduledMessageModal = ({
  message,
  isOpen,
  onClose,
  onUpdate
}: EditScheduledMessageModalProps) => {
  const [content, setContent] = useState(message.content);
  const [sendAt, setSendAt] = useState(() => {
    const date = new Date(message.sendAt);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  });
  const [priority, setPriority] = useState<'urgent' | 'reminder' | 'fyi'>(message.priority || 'fyi');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await unifiedMessagingService.updateScheduledMessage(message.id, {
        content,
        sendAt: new Date(sendAt),
        priority,
        userId: message.senderId, // Using senderId as userId for compatibility
      });

      if (result.success) {
        const updatedMessage: ScheduledMessage = {
          ...message,
          content,
          sendAt: new Date(sendAt).toISOString(),
          priority,
        };
        onUpdate(updatedMessage);
      } else {
        console.error('Failed to update message:', result.error);
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    } finally {
      setSaving(false);
    }
  };

  const priorityOptions = [
    { value: 'fyi', label: 'FYI', color: 'text-blue-400' },
    { value: 'reminder', label: 'Reminder', color: 'text-yellow-400' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Clock size={16} className="text-white" />
            </div>
            Edit Scheduled Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none backdrop-blur-sm"
              placeholder="Enter your message..."
            />
          </div>

          {/* Send Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Send At</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Priority</label>
            <div className="flex gap-2">
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPriority(option.value as any)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 ${
                    priority === option.value
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className={option.color}>●</span> {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};