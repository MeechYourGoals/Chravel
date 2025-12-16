import React, { useState } from 'react';
import { LogIn, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoModeSelector } from '../DemoModeSelector';
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

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ 
  className,
  onSettingsPress 
}) => {
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
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-md border-b border-border/50",
          "block lg:hidden", // Show on mobile/tablet, hide on desktop (1024px+)
          className
        )}
        style={{
          paddingTop: `max(8px, env(safe-area-inset-top))`,
          paddingLeft: `max(12px, env(safe-area-inset-left))`,
          paddingRight: `max(12px, env(safe-area-inset-right))`
        }}
      >
        <div className="flex items-center justify-between py-2 gap-2">
          {/* Left: ChravelApp Pill */}
          <div className="flex items-center flex-shrink-0">
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-semibold min-h-[36px] flex items-center border border-border/30">
              ChravelApp
            </span>
          </div>

          {/* Center: Demo Mode Toggle */}
          <div className="flex-1 flex justify-center min-w-0">
            <DemoModeSelector />
          </div>

          {/* Right: Login/Account Pill */}
          <div className="flex-shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2 py-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors min-h-[36px] border border-border/30">
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
                  <DropdownMenuItem 
                    onClick={onSettingsPress}
                    className="cursor-pointer"
                  >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={handleAuthClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium min-h-[36px]"
              >
                <LogIn size={16} />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};
