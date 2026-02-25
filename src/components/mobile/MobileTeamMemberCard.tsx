import React from 'react';
import { Mail, MoreVertical, Shield, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

interface MobileTeamMemberCardProps {
  member: TeamMember;
  onChangeRole?: (newRole: string) => void;
  onRemove?: () => void;
  isOwner?: boolean;
}

export const MobileTeamMemberCard = ({
  member,
  onChangeRole,
  onRemove,
  isOwner,
}: MobileTeamMemberCardProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-purple-400 bg-purple-500/20';
      case 'admin':
        return 'text-blue-400 bg-blue-500/20';
      case 'member':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Shield className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
      <Avatar className="w-12 h-12">
        <AvatarImage src={member.avatar_url} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {member.full_name?.charAt(0) || member.email?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {member.full_name || 'Former Member'}
        </p>
        {member.email && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
            <Mail className="w-3 h-3" />
            {member.email}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
            getRoleColor(member.role),
          )}
        >
          {getRoleIcon(member.role)}
          {member.role}
        </div>

        {!isOwner && member.role !== 'owner' && (onChangeRole || onRemove) && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onChangeRole && member.role !== 'admin' && (
                <DropdownMenuItem onClick={() => onChangeRole('admin')}>
                  Promote to Admin
                </DropdownMenuItem>
              )}
              {onChangeRole && member.role === 'admin' && (
                <DropdownMenuItem onClick={() => onChangeRole('member')}>
                  Demote to Member
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  Remove from Organization
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
