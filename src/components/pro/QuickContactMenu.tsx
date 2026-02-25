import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { MessageCircle, Phone, Mail, User, AlertCircle } from 'lucide-react';
import { ProParticipant } from '../../types/pro';

interface QuickContactMenuProps {
  member: ProParticipant;
  onDirectMessage?: (memberId: string) => void;
  showEmergencyContacts?: boolean;
  children: React.ReactNode;
}

export const QuickContactMenu = ({
  member,
  onDirectMessage,
  showEmergencyContacts = false,
  children,
}: QuickContactMenuProps) => {
  const handleDirectMessage = () => {
    if (onDirectMessage) {
      onDirectMessage(member.id);
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white w-56">
        <DropdownMenuLabel className="text-gray-400">Contact {member.name}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />

        {/* Direct Message */}
        {onDirectMessage && (
          <DropdownMenuItem
            onClick={handleDirectMessage}
            className="hover:bg-gray-700 cursor-pointer"
          >
            <MessageCircle size={16} className="mr-2 text-blue-400" />
            <span>Send Direct Message</span>
          </DropdownMenuItem>
        )}

        {/* Call */}
        {member.phone && (
          <DropdownMenuItem onClick={handleCall} className="hover:bg-gray-700 cursor-pointer">
            <Phone size={16} className="mr-2 text-green-400" />
            <div className="flex flex-col">
              <span>Call</span>
              <span className="text-xs text-gray-400">{member.phone}</span>
            </div>
          </DropdownMenuItem>
        )}

        {/* Email */}
        <DropdownMenuItem onClick={handleEmail} className="hover:bg-gray-700 cursor-pointer">
          <Mail size={16} className="mr-2 text-purple-400" />
          <div className="flex flex-col">
            <span>Email</span>
            <span className="text-xs text-gray-400 truncate">{member.email}</span>
          </div>
        </DropdownMenuItem>

        {/* Emergency Contact */}
        {showEmergencyContacts && member.emergencyContact && (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuLabel className="text-red-400 flex items-center gap-2">
              <AlertCircle size={14} />
              Emergency Contact
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleEmergencyCall}
              className="hover:bg-gray-700 cursor-pointer"
            >
              <Phone size={16} className="mr-2 text-red-400" />
              <div className="flex flex-col">
                <span className="font-medium">{member.emergencyContact.name}</span>
                <span className="text-xs text-gray-400">
                  {member.emergencyContact.relationship}
                </span>
                <span className="text-xs text-gray-400">{member.emergencyContact.phone}</span>
              </div>
            </DropdownMenuItem>
          </>
        )}

        {/* View Profile */}
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem className="hover:bg-gray-700 cursor-pointer text-gray-400">
          <User size={16} className="mr-2" />
          <span>View Full Profile</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
