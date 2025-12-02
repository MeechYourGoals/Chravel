import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
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
          "md:hidden", // Only show on mobile
          className
        )}
        style={{
          paddingTop: `max(8px, env(safe-area-inset-top))`
        }}
      >
        <div className="flex items-center justify-between px-3 py-2">
          {/* Logo */}
          <div className="flex items-center min-w-[60px]">
            <img 
              src="/chravel-logo.png" 
              alt="Chravel" 
              className="h-7 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Demo Mode Selector - Center */}
          <div className="flex-1 flex justify-center">
            <DemoModeSelector />
          </div>

          {/* Login/Account Button - Right */}
          <div className="min-w-[60px] flex justify-end">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
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
