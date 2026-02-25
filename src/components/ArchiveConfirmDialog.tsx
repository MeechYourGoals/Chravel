import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Archive, ArchiveRestore } from 'lucide-react';

interface ArchiveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tripTitle: string;
  isArchiving: boolean; // true for archive, false for restore
}

export const ArchiveConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  tripTitle,
  isArchiving,
}: ArchiveConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isArchiving ? (
              <Archive className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ArchiveRestore className="h-5 w-5 text-primary" />
            )}
            <AlertDialogTitle>{isArchiving ? 'Archive Trip' : 'Restore Trip'}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground">
            {isArchiving ? (
              <>
                Are you sure you want to archive "<strong>{tripTitle}</strong>"?
                <br />
                <br />
                This will hide the trip from your main list, but you can restore it anytime from
                Settings → Archived Trips.
              </>
            ) : (
              <>
                Are you sure you want to restore "<strong>{tripTitle}</strong>"?
                <br />
                <br />
                This will return the trip to your main trips list.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              isArchiving
                ? 'bg-muted-foreground hover:bg-muted-foreground/80'
                : 'bg-primary hover:bg-primary/80'
            }
          >
            {isArchiving ? 'Archive Trip' : 'Restore Trip'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
