import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Mail,
  MessageCircle,
  AlertTriangle,
  Shield,
  User,
  UtensilsCrossed,
  Copy,
  Check,
  Settings,
  ExternalLink
} from 'lucide-react';
import { ProParticipant } from '@/types/pro';
import { ProTripCategory } from '@/types/proCategories';
import { getRoleColorClass } from '@/utils/roleUtils';
import { getInitials } from '@/utils/avatarUtils';
import { toast } from 'sonner';

interface TeamMemberProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  member: ProParticipant | null;
  category: ProTripCategory;
  isAdmin?: boolean;
  onEditRole?: (member: ProParticipant) => void;
  onDirectMessage?: (memberId: string) => void;
}

export const TeamMemberProfileSheet: React.FC<TeamMemberProfileSheetProps> = ({
  isOpen,
  onClose,
  member,
  category,
  isAdmin = false,
  onEditRole,
  onDirectMessage
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!member) return null;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleCall = () => {
    if (member.phone) {
      window.location.href = `tel:${member.phone}`;
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:${member.email}`;
  };

  const handleEmergencyCall = () => {
    if (member.emergencyContact?.phone) {
      window.location.href = `tel:${member.emergencyContact.phone}`;
    }
  };

  const handleDirectMessage = () => {
    if (onDirectMessage) {
      onDirectMessage(member.id);
      onClose();
    }
  };

  const handleEditRole = () => {
    if (onEditRole) {
      onEditRole(member);
      onClose();
    }
  };

  const getCredentialBadgeColor = (level: string) => {
    switch (level) {
      case 'AllAccess':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Backstage':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Guest':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Restricted':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl bg-gray-900 border-gray-700 text-white overflow-y-auto"
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-white sr-only">Team Member Profile</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 border-4 border-gray-700 mb-4">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="bg-red-600 text-white text-2xl font-bold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-white">{member.name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              <Badge className={`${getRoleColorClass(member.role, category)} border`}>
                {member.role}
              </Badge>
              {member.credentialLevel && (
                <Badge
                  variant="outline"
                  className={getCredentialBadgeColor(member.credentialLevel)}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {member.credentialLevel}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            {member.phone && (
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-gray-800/50 border-gray-700 hover:bg-gray-700"
                onClick={handleCall}
              >
                <Phone className="w-5 h-5 text-green-400" />
                <span className="text-xs">Call</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3 bg-gray-800/50 border-gray-700 hover:bg-gray-700"
              onClick={handleEmail}
            >
              <Mail className="w-5 h-5 text-purple-400" />
              <span className="text-xs">Email</span>
            </Button>
            {onDirectMessage && (
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-gray-800/50 border-gray-700 hover:bg-gray-700"
                onClick={handleDirectMessage}
              >
                <MessageCircle className="w-5 h-5 text-blue-400" />
                <span className="text-xs">Message</span>
              </Button>
            )}
          </div>

          <Separator className="bg-gray-700" />

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Contact Information
            </h3>

            {/* Email */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-white">{member.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => copyToClipboard(member.email, 'email')}
              >
                {copiedField === 'email' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            </div>

            {/* Phone */}
            {member.phone && (
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-white">{member.phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => copyToClipboard(member.phone || '', 'phone')}
                >
                  {copiedField === 'phone' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {member.emergencyContact && (
            <>
              <Separator className="bg-gray-700" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Contact
                </h3>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{member.emergencyContact.name}</p>
                      <p className="text-sm text-gray-400">{member.emergencyContact.relationship}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEmergencyCall}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  </div>
                  <p className="text-sm text-gray-300">{member.emergencyContact.phone}</p>
                </div>
              </div>
            </>
          )}

          {/* Medical & Dietary */}
          {(member.medicalNotes || (member.dietaryRestrictions && member.dietaryRestrictions.length > 0)) && (
            <>
              <Separator className="bg-gray-700" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Health & Dietary
                </h3>

                {member.medicalNotes && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-400">Medical Alert</span>
                    </div>
                    <p className="text-sm text-gray-300">{member.medicalNotes}</p>
                  </div>
                )}

                {member.dietaryRestrictions && member.dietaryRestrictions.length > 0 && (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-400">Dietary Restrictions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.dietaryRestrictions.map((restriction, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-gray-700/50 text-gray-300 border-gray-600"
                        >
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Room Preferences */}
          {member.roomPreferences && member.roomPreferences.length > 0 && (
            <>
              <Separator className="bg-gray-700" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Room Preferences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {member.roomPreferences.map((pref, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-blue-500/10 text-blue-300 border-blue-500/30"
                    >
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Admin Actions */}
          {isAdmin && onEditRole && (
            <>
              <Separator className="bg-gray-700" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Admin Actions
                </h3>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-gray-800/50 border-gray-700 hover:bg-gray-700"
                  onClick={handleEditRole}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Member Role
                </Button>
              </div>
            </>
          )}

          {/* Close Button */}
          <div className="pt-4 pb-safe">
            <Button
              variant="outline"
              className="w-full min-h-[44px] bg-gray-800 border-gray-600 hover:bg-gray-700"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
