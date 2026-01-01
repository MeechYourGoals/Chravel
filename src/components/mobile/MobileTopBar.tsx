import React, { useState } from 'react';
import { LogIn, ChevronDown } from 'lucide-react';
import { AuthModal } from '../AuthModal';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface MobileTopBarProps {
  className?: string;
  onSettingsPress?: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onSettingsPress }) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAuthClick = () => {
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* Minimal floating auth button */}
      <div
        className="fixed top-3 right-3 z-50 block lg:hidden"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        }}
      >
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1.5 bg-background/95 hover:bg-background backdrop-blur-md rounded-lg transition-colors min-h-[36px] border border-border/50 shadow-lg">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onSettingsPress} className="cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={handleAuthClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg transition-colors min-h-[36px] shadow-lg"
          >
            <LogIn size={14} />
            <span className="text-xs font-semibold">Log In</span>
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

// Export header height for use in content offset calculations (now 0 since no full bar)
export const MOBILE_HEADER_HEIGHT = 0;
