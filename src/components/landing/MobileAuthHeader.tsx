import React, { useState, RefObject } from 'react';
import { LogIn } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoModeSelector } from '../DemoModeSelector';
import { AuthModal } from '../AuthModal';
import { cn } from '@/lib/utils';

interface MobileAuthHeaderProps {
  onSignUp?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

// Header content height (without safe area)
const HEADER_HEIGHT = 52;

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
      {/* Fixed Mobile Header - always visible, extends through safe area */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-md border-b border-border/50"
        )}
        style={{
          // Extend background through entire safe area
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Actual header content with fixed height */}
        <div 
          className="flex items-center justify-between px-3 gap-2"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          {/* ChravelApp Pill - Hidden to reduce crowding per user request
          <div className="flex items-center flex-shrink-0">
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-semibold min-h-[36px] flex items-center border border-border/30">
              ChravelApp
            </span>
          </div>
          */}

          {/* Demo Toggle - Center */}
          <div className="flex-1 flex justify-start sm:justify-center min-w-0">
            <DemoModeSelector />
          </div>

          {/* Auth CTA Button - Single prominent CTA */}
          <div className="flex-shrink-0">
            <button
              onClick={handleAuthClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium min-h-[36px] border border-primary/30"
            >
              <LogIn size={16} />
              <span>Log in</span>
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

// Export header height for use in content offset calculations
export const MOBILE_AUTH_HEADER_HEIGHT = HEADER_HEIGHT;
