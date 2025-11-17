/**
 * Message Edit Dialog
 * Allows users to edit their own messages
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface MessageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  currentContent: string;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export const MessageEditDialog: React.FC<MessageEditDialogProps> = ({
  isOpen,
  onClose,
  messageId,
  currentContent,
  onSave,
}) => {
  const [editedContent, setEditedContent] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!editedContent.trim()) {
      toast({
        title: 'Error',
        description: 'Message cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(messageId, editedContent.trim());
      toast({
        title: 'Success',
        description: 'Message updated',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="min-h-[100px]"
          placeholder="Edit your message..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
