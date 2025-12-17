import React from 'react';
import { Share2, FileDown, UserPlus, X } from 'lucide-react';
import { hapticService } from '../../services/hapticService';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';

interface MobileHeaderOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onInvite?: () => void;
  tripTitle?: string;
}

export const MobileHeaderOptionsSheet: React.FC<MobileHeaderOptionsSheetProps> = ({
  isOpen,
  onClose,
  onShare,
  onExport,
  onInvite,
  tripTitle = 'Trip'
}) => {
  const handleAction = (action?: () => void) => {
    hapticService.light();
    onClose();
    if (action) {
      // Small delay to let drawer close animation complete
      setTimeout(action, 150);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-gray-900 border-gray-800">
        <DrawerHeader className="border-b border-gray-800 pb-4">
          <DrawerTitle className="text-white text-center">{tripTitle}</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-4 space-y-2">
          {onShare && (
            <button
              onClick={() => handleAction(onShare)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Share2 size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Share Trip</p>
                <p className="text-gray-400 text-sm">Send trip details to friends</p>
              </div>
            </button>
          )}
          
          {onExport && (
            <button
              onClick={() => handleAction(onExport)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <FileDown size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-medium">Export to PDF</p>
                <p className="text-gray-400 text-sm">Download trip summary</p>
              </div>
            </button>
          )}
          
          {onInvite && (
            <button
              onClick={() => handleAction(onInvite)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <UserPlus size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">Invite</p>
                <p className="text-gray-400 text-sm">Add people to this trip</p>
              </div>
            </button>
          )}
        </div>
        
        <div className="p-4 pt-0">
          <button
            onClick={() => handleAction()}
            className="w-full p-4 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.98] transition-all text-gray-400 font-medium"
          >
            Cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
