
import React, { useEffect } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '../../hooks/use-mobile';
import { MobileOptimizationService } from '../../services/mobileOptimizationService';
import { NativeMobileService } from '../../services/nativeMobileService';
import { cn } from '@/lib/utils';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileAppLayout = ({ children, className }: MobileAppLayoutProps) => {
  const isMobile = useIsMobile();

  // 🆕 Initialize mobile optimizations
  useEffect(() => {
    if (isMobile) {
      MobileOptimizationService.initializeMobileOptimizations();
      MobileOptimizationService.trackMobilePerformance();
      
      // Initialize native features
      NativeMobileService.initialize();
      NativeMobileService.trackNativePerformance();
    }
  }, [isMobile]);

  if (!isMobile) {
    // On desktop, return children without mobile layout
    return <>{children}</>;
  }

  return (
    <div
      className={cn("flex flex-col min-h-screen bg-gray-900", className)}
      style={{
        // Use dynamic viewport to avoid iOS 100vh bottom gap
        minHeight: '100dvh'
      }}
    >
      {/* Main content area with bottom padding for nav */}
      <main 
        className="flex-1 pb-mobile-nav-height overflow-y-auto"
        style={{
          paddingBottom: `calc(80px + env(safe-area-inset-bottom))`,
          // 🆕 Mobile performance optimizations
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          transform: 'translateZ(0)', // Hardware acceleration
          backfaceVisibility: 'hidden'
        }}
      >
        {children}
      </main>
      
      {/* Fixed bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};

