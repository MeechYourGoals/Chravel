import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Megaphone, Send, AlertTriangle, Users, CheckCircle2, X } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { roleBroadcastService } from '../../services/roleBroadcastService';
import { getRoleColorClass } from '../../utils/roleUtils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '../../utils/avatarUtils';

interface RoleBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  roster: ProParticipant[];
  category: ProTripCategory;
  availableRoles: string[];
  preselectedRole?: string;
}

export const RoleBroadcastModal = ({
  isOpen,
  onClose,
  tripId,
  roster,
  category,
  availableRoles,
  preselectedRole,
}: RoleBroadcastModalProps) => {
  const [message, setMessage] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    preselectedRole ? [preselectedRole] : [],
  );
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSending, setIsSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role],
    );
  };

  const selectAllRoles = () => {
    setSelectedRoles(availableRoles);
  };

  const clearRoles = () => {
    setSelectedRoles([]);
  };

  const recipientCount = roleBroadcastService.getRecipientCount(roster, selectedRoles);
  const recipients = roleBroadcastService.getMembersByRoles(roster, selectedRoles);

  const handleSend = async () => {
    if (!message.trim() || selectedRoles.length === 0) return;

    setIsSending(true);
    try {
      const success = await roleBroadcastService.sendToMultipleRoles(
        tripId,
        selectedRoles,
        message.trim(),
        priority,
      );

      if (success) {
        setSendComplete(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedRoles(preselectedRole ? [preselectedRole] : []);
    setPriority('normal');
    setSendComplete(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone size={20} />
            Role-Based Announcement
          </DialogTitle>
        </DialogHeader>

        {!sendComplete ? (
          <div className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Target Roles</Label>
                <div className="flex gap-2">
                  <Button onClick={selectAllRoles} variant="ghost" size="sm" className="text-xs">
                    Select All
                  </Button>
                  <Button
                    onClick={clearRoles}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    disabled={selectedRoles.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-lg p-4 border border-gray-700">
                {availableRoles.map(role => {
                  const roleMembers = roster.filter(m => m.role === role);
                  return (
                    <label
                      key={role}
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedRoles.includes(role)
                          ? 'bg-red-500/20 border border-red-500/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                        className="border-gray-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{role}</span>
                        <span className="text-xs text-gray-400 ml-2">({roleMembers.length})</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Recipient Preview */}
              {recipientCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-400" />
                    <span className="text-blue-400 text-sm font-medium">
                      This will reach {recipientCount} team member{recipientCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Priority Toggle */}
            <div className="space-y-2">
              <Label>Message Priority</Label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPriority('normal')}
                  variant={priority === 'normal' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  Normal
                </Button>
                <Button
                  onClick={() => setPriority('urgent')}
                  variant={priority === 'urgent' ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-1 ${
                    priority === 'urgent'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'border-red-600 text-red-400 hover:bg-red-600/10'
                  }`}
                >
                  <AlertTriangle size={14} className="mr-2" />
                  Urgent
                </Button>
              </div>
            </div>

            {/* Message Composer */}
            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Message</Label>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Announcement for ${selectedRoles.join(', ') || 'selected roles'}...${
                  priority === 'urgent' ? '\n\n⚠️ This will send push notifications' : ''
                }`}
                className="bg-gray-800 border-gray-600 text-white min-h-[150px]"
                disabled={isSending}
              />
              <p className="text-xs text-gray-400">{message.length} / 500 characters</p>
            </div>

            {/* Urgent Warning */}
            {priority === 'urgent' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-red-400">Urgent Broadcast</p>
                    <p className="text-sm text-gray-300 mt-1">
                      This will send immediate push notifications to all {recipientCount} recipients
                      and appear at the top of their chat. Use sparingly for time-sensitive
                      information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Recipients */}
            {recipients.length > 0 && recipients.length <= 10 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Recipients:</Label>
                <div className="flex flex-wrap gap-2">
                  {recipients.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-white/5 border border-gray-700 rounded px-2 py-1"
                    >
                      <Avatar className="w-5 h-5 flex-shrink-0">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isSending}
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || selectedRoles.length === 0 || isSending}
                className={`flex-1 ${
                  priority === 'urgent'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send to {recipientCount} Member{recipientCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Broadcast Sent!</h3>
            <p className="text-gray-400">
              Your announcement has been delivered to {recipientCount} team member
              {recipientCount !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
