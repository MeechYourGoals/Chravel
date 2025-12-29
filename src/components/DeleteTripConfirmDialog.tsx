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
import { Trash2 } from 'lucide-react';

interface DeleteTripConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tripTitle: string;
  isLoading?: boolean;
  isCreator?: boolean;
}

export const DeleteTripConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  tripTitle,
  isLoading = false,
  isCreator = false
}: DeleteTripConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Trip For Me</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground">
            {isCreator ? (
              <>
                <span className="text-yellow-500 font-medium">You created this trip.</span> Are you sure you want to remove it from your account?
                <br />
                <br />
                Consider archiving instead if you might want to access it later.
                <br />
                <br />
              </>
            ) : (
              <>
                Are you sure you want to delete "<strong>{tripTitle}</strong>" from your account?
                <br />
                <br />
              </>
            )}
            <span className="text-destructive/80">This action cannot be undone.</span> You will lose access to this trip and all its content. The trip will still exist for other members.
            <br />
            <br />
            To regain access, someone in the trip will need to send you a new invite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
          >
            {isLoading ? 'Deleting...' : 'Delete For Me'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
