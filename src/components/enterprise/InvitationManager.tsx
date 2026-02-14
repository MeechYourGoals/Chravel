import React, { useState } from 'react';
import { Send, Users, Clock, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { RosterMember, InvitationBatch } from '../../types/enterprise';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvitationManagerProps {
  selectedMembers: string[];
  members: RosterMember[];
  onSendBatchInvitations: (batch: InvitationBatch) => void;
  onClearSelection: () => void;
}

export const InvitationManager = ({ 
  selectedMembers, 
  members, 
  onSendBatchInvitations,
  onClearSelection 
}: InvitationManagerProps) => {
  const [customMessage, setCustomMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedMemberDetails = members.filter(m => selectedMembers.includes(m.id));
  const canInviteMembers = selectedMemberDetails.filter(m => 
    m.status === 'invited' || m.status === 'declined' || !m.invitationSent
  );

  const generateInviteToken = () => {
    return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendInvitations = async () => {
    setIsSending(true);
    
    const batch: InvitationBatch = {
      members: canInviteMembers.map(m => m.id),
      message: customMessage.trim() || undefined,
      priority: isUrgent ? 'urgent' : 'normal'
    };

    try {
      // Send invitations via edge function
      for (const member of canInviteMembers) {
        const { error } = await supabase.functions.invoke('send-organization-invite', {
          body: {
            email: member.email,
            phone: member.phone,
            organization_name: 'ChravelApp Organization',
            organization_id: 'default-org',
            role: member.role,
            invite_token: generateInviteToken(),
            custom_message: batch.message,
            priority: batch.priority
          }
        });

        if (error) {
          console.error(`Failed to send invite to ${member.email}:`, error);
          toast.error(`Failed to send invite to ${member.name}`);
        } else {
          toast.success(`Invite sent to ${member.name}`);
        }
      }

      await onSendBatchInvitations(batch);
      setCustomMessage('');
      setIsUrgent(false);
      onClearSelection();
      toast.success(`Successfully sent ${canInviteMembers.length} invitations`);
    } catch (error) {
      console.error('Batch invitation error:', error);
      toast.error('Failed to send some invitations');
    } finally {
      setIsSending(false);
    }
  };

  if (selectedMembers.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center text-gray-400">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select team members to send batch invitations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-white">Batch Invitations</h4>
        <Badge className="bg-primary/20 text-primary">
          {selectedMembers.length} selected
        </Badge>
      </div>

      {/* Selected Members Summary */}
      <div className="mb-6">
        <Label className="text-white mb-2 block">Selected Members</Label>
        <div className="bg-white/5 rounded-lg p-4 max-h-32 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedMemberDetails.map(member => (
              <div key={member.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{member.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{member.role}</span>
                  {member.status === 'active' ? (
                    <Check size={12} className="text-green-400" />
                  ) : member.invitationSent ? (
                    <Clock size={12} className="text-yellow-400" />
                  ) : (
                    <AlertCircle size={12} className="text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invitation Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-green-400">
            {canInviteMembers.length}
          </div>
          <div className="text-xs text-gray-400">Can Invite</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-yellow-400">
            {selectedMemberDetails.filter(m => m.invitationSent && m.status !== 'active').length}
          </div>
          <div className="text-xs text-gray-400">Pending</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-blue-400">
            {selectedMemberDetails.filter(m => m.status === 'active').length}
          </div>
          <div className="text-xs text-gray-400">Active</div>
        </div>
      </div>

      {/* Custom Message */}
      <div className="mb-6">
        <Label htmlFor="message" className="text-white mb-2 block">
          Custom Message (Optional)
        </Label>
        <Textarea
          id="message"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Add a personal message to the invitation..."
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-20"
          maxLength={500}
        />
        <div className="text-xs text-gray-400 mt-1">
          {customMessage.length}/500 characters
        </div>
      </div>

      {/* Priority Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-white font-medium">Urgent Priority</div>
          <div className="text-sm text-gray-400">
            Mark as urgent for immediate attention
          </div>
        </div>
        <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onClearSelection}
          className="flex-1"
          disabled={isSending}
        >
          Clear Selection
        </Button>
        <Button 
          onClick={handleSendInvitations}
          className="flex-1 bg-primary hover:bg-primary/80"
          disabled={canInviteMembers.length === 0 || isSending}
        >
          {isSending ? (
            'Sending...'
          ) : (
            <>
              <Send size={16} className="mr-2" />
              Send {canInviteMembers.length} Invitations
            </>
          )}
        </Button>
      </div>

      {canInviteMembers.length !== selectedMembers.length && (
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            {selectedMembers.length - canInviteMembers.length} members are already active and don't need invitations
          </div>
        </div>
      )}
    </div>
  );
};