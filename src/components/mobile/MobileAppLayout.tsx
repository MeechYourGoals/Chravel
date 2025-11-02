
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
    if (!isMobile) return;

    const initServices = async () => {
      try {
        // Attach individual catch handlers to prevent unhandled promise rejections
        // if the timeout resolves first.
        const mobileOptimizations = MobileOptimizationService.initializeMobileOptimizations().catch(err => {
          console.warn('Failed to initialize mobile optimizations:', err);
        });

        const nativeInitialization = NativeMobileService.initialize().catch(err => {
          console.warn('Failed to initialize native mobile services:', err);
        });

        await Promise.race([
          Promise.all([mobileOptimizations, nativeInitialization]),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);

        // Start tracking after initialization
        MobileOptimizationService.trackMobilePerformance();
        NativeMobileService.trackNativePerformance();
      } catch (error) {
        console.warn('Mobile services initialization timed out or failed:', error);
      }
    };

    initServices();
  }, [isMobile]);

  return (
    <div className={cn(
      "flex flex-col min-h-screen",
      isMobile ? "bg-gray-900" : "bg-background",
      className
    )}>
      <main
        className={cn(
          "flex-1 overflow-y-auto",
          isMobile && "pb-mobile-nav-height"
        )}
        style={isMobile ? {
          paddingBottom: `calc(80px + env(safe-area-inset-bottom))`,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        } : undefined}
      >
        {children}
      </main>

      {isMobile && <MobileBottomNav />}
    </div>
  );
};

