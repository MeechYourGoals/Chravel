/**
 * MessageActions Component
 *
 * Provides edit and delete actions for messages
 * Shows as a dropdown menu on message hover
 */

import React, { useState } from 'react';
import { Edit, Trash2, MoreVertical, Pin, PinOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  editChatMessage,
  editChannelMessage,
  deleteChatMessage,
  deleteChannelMessage,
  pinMessage,
  unpinMessage,
} from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';

export interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  messageType: 'channel' | 'trip';
  isOwnMessage: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, pinned: boolean) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  messageContent,
  messageType,
  isOwnMessage,
  isDeleted = false,
  isPinned = false,
  onEdit,
  onDelete,
  onPin,
}) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedContent, setEditedContent] = useState(messageContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Hide actions if message is deleted
  if (isDeleted) {
    return null;
  }

  const handleEdit = async () => {
    if (!editedContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (editedContent === messageContent) {
      setShowEditDialog(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const success =
        messageType === 'channel'
          ? await editChannelMessage(messageId, editedContent)
          : await editChatMessage(messageId, editedContent);

      if (success) {
        toast.success('Message edited');
        setShowEditDialog(false);
        onEdit?.(messageId, editedContent);
      } else {
        toast.error('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const success =
        messageType === 'channel'
          ? await deleteChannelMessage(messageId)
          : await deleteChatMessage(messageId);

      if (success) {
        toast.success('Message deleted');
        setShowDeleteDialog(false);
        onDelete?.(messageId);
      } else {
        toast.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePin = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      let success = false;
      if (isPinned) {
        success = await unpinMessage(messageId);
      } else {
        success = await pinMessage(messageId, user.id);
      }

      if (success) {
        toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
        onPin?.(messageId, !isPinned);
      } else {
        toast.error(isPinned ? 'Failed to unpin message' : 'Failed to pin message');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {messageType === 'trip' && (
            <DropdownMenuItem onClick={handlePin}>
              {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
          )}

          {isOwnMessage && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setEditedContent(messageContent);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              placeholder="Edit your message..."
              className="bg-gray-800 border-white/10 text-white min-h-[100px]"
              disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowEditDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={isSubmitting || !editedContent.trim()}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Message</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
