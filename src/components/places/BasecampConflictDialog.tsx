import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface BasecampConflictDialogProps {
  isOpen: boolean;
  onKeepYours: () => void;
  onUseTheirs: () => void;
  onCancel: () => void;
  yourAddress: string;
  theirAddress: string;
}

export const BasecampConflictDialog = ({
  isOpen,
  onKeepYours,
  onUseTheirs,
  onCancel,
  yourAddress,
  theirAddress
}: BasecampConflictDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Basecamp Conflict Detected</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-3">
            <p>Another user updated the basecamp while you were editing.</p>
            
            <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
              <div>
                <strong className="text-amber-600">Your changes:</strong>
                <p className="mt-1">{yourAddress}</p>
              </div>
              <div className="mt-2">
                <strong className="text-blue-600">Their changes:</strong>
                <p className="mt-1">{theirAddress}</p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onKeepYours} variant="default">
            Keep My Changes
          </Button>
          <Button onClick={onUseTheirs} variant="outline">
            Use Their Changes
          </Button>
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
