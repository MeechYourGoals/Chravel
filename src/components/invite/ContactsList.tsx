import React, { useState, useMemo } from 'react';
import { Search, User, Send, Smartphone } from 'lucide-react';
import { Contact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContactsListProps {
  contacts: Contact[];
  inviteLink: string;
  tripName: string;
}

export const ContactsList = ({ contacts, inviteLink, tripName }: ContactsListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumbers.some(phone => phone.includes(query))
    );
  }, [contacts, searchQuery]);

  const handleInvite = (phoneNumber: string) => {
    const message = `Join me on "${tripName}"! Here's the link: ${inviteLink}`;
    // Use sms: scheme to open native messages app
    // Note: iOS uses &body=, Android often supports ?body= too but spec is slightly different.
    // Most modern handlers support ?body=
    const separator = navigator.userAgent.match(/iPhone|iPad|iPod/i) ? '&' : '?';
    window.location.href = `sms:${phoneNumber}${separator}body=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No contacts found' : 'No contacts available'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-white font-medium truncate">{contact.name}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Smartphone size={10} />
                    {contact.phoneNumbers[0]}
                    {contact.phoneNumbers.length > 1 && ` +${contact.phoneNumbers.length - 1} more`}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg gap-1.5 flex-shrink-0"
                onClick={() => handleInvite(contact.phoneNumbers[0])}
              >
                <Send size={14} />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
