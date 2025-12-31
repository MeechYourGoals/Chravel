import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoModeSelector } from '../DemoModeSelector';

interface MobileAuthHeaderProps {
  onSignUp?: () => void;
}

export const MobileAuthHeader: React.FC<MobileAuthHeaderProps> = ({ onSignUp: _onSignUp }) => {
  const isMobile = useIsMobile();

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Fixed Mobile Header - No auth button (CTA is centered in hero content) */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50"
        style={{
          paddingTop: `max(8px, env(safe-area-inset-top))`
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          {/* Chravel Pill */}
          <div className="flex items-center flex-shrink-0">
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-semibold min-h-[36px] flex items-center border border-border/30">
              Chravel
            </span>
          </div>

          {/* Demo Toggle - Right aligned */}
          <div className="flex-shrink-0">
            <DemoModeSelector />
          </div>
        </div>
      </div>
    </>
  );
};
