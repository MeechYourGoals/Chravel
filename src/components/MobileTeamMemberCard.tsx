import { Shield, User, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';

interface MobileTeamMemberCardProps {
  member: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    status?: 'active' | 'pending' | 'invited';
  };
  onChangeRole?: (newRole: string) => void;
  onRemove?: () => void;
  isCurrentUser?: boolean;
}

export const MobileTeamMemberCard = ({ 
  member, 
  onChangeRole, 
  onRemove,
  isCurrentUser 
}: MobileTeamMemberCardProps) => {
  const getRoleIcon = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'owner') return <Shield size={16} className="text-yellow-400" />;
    if (lowerRole === 'admin') return <Shield size={16} className="text-blue-400" />;
    return <User size={16} className="text-gray-400" />;
  };

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'owner') return 'text-yellow-400 bg-yellow-400/10';
    if (lowerRole === 'admin') return 'text-blue-400 bg-blue-400/10';
    return 'text-gray-400 bg-gray-400/10';
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'active') return null;
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
        status === 'invited' ? 'bg-blue-500/20 text-blue-400' :
        'bg-gray-500/20 text-gray-400'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {member.name}
                </span>
                {isCurrentUser && (
                  <span className="text-xs text-gray-400">(You)</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getRoleColor(member.role)}`}>
                  {getRoleIcon(member.role)}
                  {member.role}
                </span>
                {getStatusBadge(member.status)}
              </div>
            </div>
          </div>

          {/* Actions Dropdown */}
          {(onChangeRole || onRemove) && !isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger className="text-gray-400 hover:text-white">
                <MoreVertical size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-white/10">
                {onChangeRole && (
                  <>
                    <DropdownMenuLabel className="text-gray-400">Change Role</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => onChangeRole('admin')}
                      className="text-white hover:bg-white/10"
                    >
                      <Shield size={16} className="mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onChangeRole('member')}
                      className="text-white hover:bg-white/10"
                    >
                      <User size={16} className="mr-2" />
                      Make Member
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}
                {onRemove && (
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Remove from Organization
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
};