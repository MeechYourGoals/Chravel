import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoModeSelector } from '../DemoModeSelector';
import { AuthModal } from '../AuthModal';

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
      <div 
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50"
        style={{
          paddingTop: `max(8px, env(safe-area-inset-top))`
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          {/* ChravelApp Pill */}
          <div className="flex items-center flex-shrink-0">
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-semibold min-h-[36px] flex items-center border border-border/30">
              ChravelApp
            </span>
          </div>

          {/* Demo Toggle - Center */}
          <div className="flex-1 flex justify-center min-w-0">
            <DemoModeSelector />
          </div>

          {/* Login Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleAuthClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium min-h-[36px] border border-primary/30"
            >
              <LogIn size={16} />
              <span>Log In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {!onSignUp && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
};
