import React, { useState } from 'react';
import { Mail, Send, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { EventSetupData, EventInvitation } from '@/types';

interface Invitation {
  id: string;
  email: string;
  name: string;
  role: 'attendee' | 'speaker' | 'organizer' | 'exhibitor';
  status: 'pending' | 'sent' | 'accepted' | 'declined';
  sentAt?: string;
}

interface InvitationManagerProps {
  eventData: EventSetupData;
  onInvitationsUpdate: (invitations: EventInvitation[]) => void;
}

export const InvitationManager = ({ eventData, onInvitationsUpdate }: InvitationManagerProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInvite, setNewInvite] = useState({ email: '', name: '', role: 'attendee' as const });
  const [bulkEmails, setBulkEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState(
    `You're invited to ${eventData.name || 'our event'}!\n\nJoin us for an amazing experience.\n\nEvent Details:\nDate: ${eventData.startDate} - ${eventData.endDate}\nLocation: ${eventData.location}\n\nWe look forward to seeing you there!`,
  );
  const { toast } = useToast();

  const addInvitation = () => {
    if (!newInvite.email || !newInvite.name) {
      toast({
        title: 'Missing information',
        description: 'Please provide both email and name.',
        variant: 'destructive',
      });
      return;
    }

    const invitation: Invitation = {
      id: Date.now().toString(),
      email: newInvite.email,
      name: newInvite.name,
      role: newInvite.role,
      status: 'pending',
    };

    const updated = [...invitations, invitation];
    setInvitations(updated);
    onInvitationsUpdate(updated);
    setNewInvite({ email: '', name: '', role: 'attendee' });

    toast({
      title: 'Invitation added',
      description: `Added invitation for ${newInvite.name}`,
    });
  };

  const processBulkEmails = () => {
    const emails = bulkEmails
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('@'))
      .map(email => {
        const name = email.split('@')[0].replace(/[._]/g, ' ');
        return {
          id: Date.now().toString() + Math.random(),
          email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          role: 'attendee' as const,
          status: 'pending' as const,
        };
      });

    const updated = [...invitations, ...emails];
    setInvitations(updated);
    onInvitationsUpdate(updated);
    setBulkEmails('');

    toast({
      title: 'Bulk invitations added',
      description: `Added ${emails.length} invitations`,
    });
  };

  const sendInvitations = () => {
    const pendingInvites = invitations.filter(inv => inv.status === 'pending');

    // Mock sending process
    const updated = invitations.map(inv =>
      inv.status === 'pending' ? { ...inv, status: 'sent' as const } : inv,
    );

    setInvitations(updated);
    onInvitationsUpdate(updated);

    toast({
      title: 'Invitations sent',
      description: `Sent ${pendingInvites.length} invitations`,
    });
  };

  const removeInvitation = (id: string) => {
    const updated = invitations.filter(inv => inv.id !== id);
    setInvitations(updated);
    onInvitationsUpdate(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'sent':
        return 'text-blue-400';
      case 'accepted':
        return 'text-green-400';
      case 'declined':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Invitation Message</h4>
        <Textarea
          value={inviteMessage}
          onChange={e => setInviteMessage(e.target.value)}
          className="bg-gray-800/50 border-gray-600 text-white"
          rows={6}
          placeholder="Customize your invitation message..."
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Single Invitation */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Add Individual Invitation</h4>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div>
              <Label htmlFor="invite-name" className="text-white">
                Name
              </Label>
              <Input
                id="invite-name"
                value={newInvite.name}
                onChange={e => setNewInvite({ ...newInvite, name: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
                placeholder="Attendee name"
              />
            </div>
            <div>
              <Label htmlFor="invite-email" className="text-white">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={newInvite.email}
                onChange={e => setNewInvite({ ...newInvite, email: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role" className="text-white">
                Role
              </Label>
              <select
                id="invite-role"
                value={newInvite.role}
                onChange={e => setNewInvite({ ...newInvite, role: e.target.value as any })}
                className="w-full mt-1 bg-gray-800/50 border border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="attendee">Attendee</option>
                <option value="speaker">Speaker</option>
                <option value="organizer">Organizer</option>
                <option value="exhibitor">Exhibitor</option>
              </select>
            </div>
            <Button
              onClick={addInvitation}
              className="w-full bg-glass-orange hover:bg-glass-orange/80"
            >
              <Plus size={16} className="mr-2" />
              Add Invitation
            </Button>
          </div>
        </div>

        {/* Bulk Invitations */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Bulk Email Import</h4>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div>
              <Label htmlFor="bulk-emails" className="text-white">
                Email Addresses
              </Label>
              <Textarea
                id="bulk-emails"
                value={bulkEmails}
                onChange={e => setBulkEmails(e.target.value)}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
                rows={6}
                placeholder="Enter email addresses (one per line)&#10;john@example.com&#10;jane@example.com&#10;bob@example.com"
              />
            </div>
            <Button
              onClick={processBulkEmails}
              className="w-full bg-glass-orange hover:bg-glass-orange/80"
            >
              <Mail size={16} className="mr-2" />
              Import Emails
            </Button>
          </div>
        </div>
      </div>

      {/* Invitation List */}
      {invitations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Invitations ({invitations.length})</h4>
            <div className="flex gap-2">
              <Button
                onClick={sendInvitations}
                size="sm"
                className="bg-glass-orange hover:bg-glass-orange/80"
              >
                <Send size={16} className="mr-2" />
                Send All Pending ({invitations.filter(i => i.status === 'pending').length})
              </Button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border-b border-white/10 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-white">{invitation.name}</div>
                        <div className="text-sm text-gray-400">{invitation.email}</div>
                      </div>
                      <div className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">
                        {invitation.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-medium ${getStatusColor(invitation.status)}`}>
                      {invitation.status.toUpperCase()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvitation(invitation.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
