import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoModeToggle } from '../DemoModeToggle';
import { AuthModal } from '../AuthModal';
import charavelLogo from '@/assets/chravel-logo-white.png';

interface MobileAuthHeaderProps {
  onSignUp?: () => void;
}

export const MobileAuthHeader: React.FC<MobileAuthHeaderProps> = ({ onSignUp }) => {
  const isMobile = useIsMobile();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Only render on mobile
  if (!isMobile) return null;

  const handleAuthClick = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      {/* Fixed Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center">
            <img src={charavelLogo} alt="Chravel" className="h-8 w-auto" />
          </div>

          {/* Demo Toggle */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <DemoModeToggle />
          </div>

          {/* Login Button */}
          <button
            onClick={handleAuthClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors min-h-[44px]"
          >
            <LogIn size={18} />
            <span className="text-sm font-medium">Log In</span>
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {!onSignUp && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
};
