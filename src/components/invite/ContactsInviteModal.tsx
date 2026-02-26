import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { ContactsList } from './ContactsList';
import { Button } from '@/components/ui/button';

interface ContactsInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink: string;
  tripName: string;
}

export const ContactsInviteModal = ({
  isOpen,
  onClose,
  inviteLink,
  tripName,
}: ContactsInviteModalProps) => {
  const { contacts, isLoading, error, fetchContacts, requestPermission, permissionStatus } = useContacts();

  useEffect(() => {
    if (isOpen) {
      // If permission is already granted or unknown, try fetching
      if (permissionStatus === 'granted' || permissionStatus === 'unknown') {
        fetchContacts();
      }
    }
  }, [isOpen, fetchContacts, permissionStatus]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-scale-in overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Invite Contacts</h2>
            <p className="text-xs text-gray-400">Select contacts to send invite via SMS</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm">Loading contacts...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Access Required</h3>
                <p className="text-sm text-gray-400 mb-4">{error}</p>
                <Button
                  onClick={() => requestPermission().then(granted => { if(granted) fetchContacts(); })}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Grant Permission
                </Button>
              </div>
            </div>
          ) : (
            <ContactsList
              contacts={contacts}
              inviteLink={inviteLink}
              tripName={tripName}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
