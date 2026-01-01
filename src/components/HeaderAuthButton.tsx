import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './AuthModal';
import { SettingsMenu } from './SettingsMenu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

interface HeaderAuthButtonProps {
  /**
   * When false, the signed-out "Log In" CTA is hidden.
   * Useful for keeping app surfaces visually clean while still allowing auth via Settings.
   */
  showLoggedOut?: boolean;
}

export const HeaderAuthButton = ({ showLoggedOut = true }: HeaderAuthButtonProps) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (user) {
    return (
      <>
        <Button
          onClick={() => setShowSettings(true)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 transition-all duration-200 rounded-xl
            bg-background/40 border-border/50 border-2 text-foreground/90 hover:bg-background/50
            backdrop-blur-md h-14 px-3"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-medium hidden sm:inline">Account</span>
        </Button>
        <SettingsMenu
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          initialConsumerSection="profile"
          initialSettingsType="consumer"
        />
      </>
    );
  }

  if (!showLoggedOut) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowAuthModal(true)}
        variant="outline"
        size="sm"
        className="flex items-center justify-center gap-1.5 transition-all duration-200 rounded-lg
          bg-primary/30 border-primary/70 border-2 text-primary hover:bg-primary/40
          shadow-lg shadow-primary/20 backdrop-blur-md h-9 px-3 whitespace-nowrap"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">Log In</span>
      </Button>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
