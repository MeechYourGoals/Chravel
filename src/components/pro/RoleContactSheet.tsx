import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { 
  Users, MessageCircle, Phone, Mail, Send, AlertTriangle, X 
} from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { getRoleColorClass } from '../../utils/roleUtils';
import { ProTripCategory } from '../../types/proCategories';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '../../utils/avatarUtils';

interface RoleContactSheetProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
  members: ProParticipant[];
  category: ProTripCategory;
  onSendGroupMessage?: (memberIds: string[], message: string, isUrgent: boolean) => Promise<void>;
}

export const RoleContactSheet = ({
  isOpen,
  onClose,
  role,
  members,
  category,
  onSendGroupMessage
}: RoleContactSheetProps) => {
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const membersWithPhone = members.filter(m => m.phone);

  const handleSendMessage = async () => {
    if (!message.trim() || !onSendGroupMessage) return;

    setIsSending(true);
    try {
      await onSendGroupMessage(
        members.map(m => m.id),
        message.trim(),
        isUrgent
      );
      setMessage('');
      setIsUrgent(false);
      onClose();
    } catch (error) {
      console.error('Failed to send group message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCallAll = () => {
    // In a real implementation, this would trigger a conference call or sequential calls
    alert(`Calling ${membersWithPhone.length} members with phone numbers`);
  };

  const handleEmailAll = () => {
    const emails = members.map(m => m.email).join(',');
    window.location.href = `mailto:${emails}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Contact All {role} ({members.length})
          </DialogTitle>
        </DialogHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          {onSendGroupMessage && (
            <Button
              variant="outline"
              className="flex-1"
              disabled={!members.length}
            >
              <MessageCircle size={16} className="mr-2 text-blue-400" />
              Group Message
            </Button>
          )}
          {membersWithPhone.length > 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCallAll}
            >
              <Phone size={16} className="mr-2 text-green-400" />
              Call All ({membersWithPhone.length})
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleEmailAll}
          >
            <Mail size={16} className="mr-2 text-purple-400" />
            Email All
          </Button>
        </div>

        {/* Group Message Composer */}
        {onSendGroupMessage && (
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Send Message to All {role}</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
                />
                <AlertTriangle size={14} className={isUrgent ? 'text-red-400' : 'text-gray-400'} />
                <span className={isUrgent ? 'text-red-400' : 'text-gray-400'}>Mark as Urgent</span>
              </label>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message for all ${role} members...${isUrgent ? '\n\n⚠️ This will be marked as URGENT' : ''}`}
              className="bg-gray-800 border-gray-600 text-white min-h-[120px]"
              disabled={isSending}
            />

            {isUrgent && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Urgent messages will send push notifications to all recipients
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className={`flex-1 ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send to {members.length} Member{members.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setMessage('');
                  setIsUrgent(false);
                }}
                variant="outline"
                disabled={isSending}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Member List */}
        <div className="space-y-3 border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400">All {role} Members:</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                    {member.phone && (
                      <p className="text-xs text-gray-500">{member.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="Call"
                    >
                      <Phone size={16} className="text-green-400" />
                    </a>
                  )}
                  <a
                    href={`mailto:${member.email}`}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title="Email"
                  >
                    <Mail size={16} className="text-purple-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button onClick={onClose} variant="outline">
            <X size={16} className="mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

