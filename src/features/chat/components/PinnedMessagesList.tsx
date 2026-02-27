import React from 'react';
import { PinOff, X, MessageSquare } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { unpinMessage } from '@/services/chatService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface PinnedMessagesListProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[]; // Row type is complex to import here; effectively TripChatMessage
  onUnpin?: (messageId: string) => void;
}

export const PinnedMessagesList: React.FC<PinnedMessagesListProps> = ({
  isOpen,
  onClose,
  messages,
  onUnpin,
}) => {
  const { user: _user } = useAuth();

  const handleUnpin = async (messageId: string) => {
    try {
      const success = await unpinMessage(messageId);
      if (success) {
        toast.success('Message unpinned');
        onUnpin?.(messageId);
      } else {
        toast.error('Failed to unpin message');
      }
    } catch (error) {
      console.error('Error unpinning message:', error);
      toast.error('Failed to unpin message');
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    onClose();
    // Use the existing mechanism to scroll to message
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('search-highlight-flash');
        setTimeout(() => el.classList.remove('search-highlight-flash'), 1000);
      } else {
        toast('Message is not currently loaded in view');
      }
    }, 300);
  };

  return (
    <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle>Pinned Messages</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pinned messages</div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className="bg-muted/30 border border-border/50 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{msg.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleJumpToMessage(msg.id)}
                      title="Jump to message"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnpin(msg.id)}
                      title="Unpin"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-foreground/90 whitespace-pre-wrap pl-1 border-l-2 border-primary/20">
                  {msg.content}
                </div>

                {msg.payload?.pinned_at && (
                  <div className="text-[10px] text-muted-foreground text-right pt-1">
                    Pinned{' '}
                    {formatDistanceToNow(new Date(msg.payload.pinned_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
