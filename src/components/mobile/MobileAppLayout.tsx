
import React, { useEffect } from 'react';
import { useIsMobile } from '../../hooks/use-mobile';
import { MobileOptimizationService } from '../../services/mobileOptimizationService';
import { NativeMobileService } from '../../services/nativeMobileService';
import { initializeNativeShell } from '@/native/nativeShell';
import { cn } from '@/lib/utils';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileAppLayout = ({ children, className }: MobileAppLayoutProps) => {
  const isMobile = useIsMobile();

  // 🆕 Initialize mobile optimizations
  useEffect(() => {
    const initServices = async () => {
      try {
        // Native shell polish (no-op on web): status bar + keyboard integration.
        const nativeShellCleanup = await initializeNativeShell().catch(() => {
          return () => {};
        });

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

        return nativeShellCleanup;
      } catch (error) {
        console.warn('Mobile services initialization timed out or failed:', error);
      }
    };

    let cleanup: (() => void) | undefined;
    initServices()
      .then(c => {
        cleanup = c;
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cleanup?.();
    };
  }, [isMobile]);

  return (
    <div className={cn(
      "flex flex-col min-h-screen",
      isMobile ? "bg-gray-900" : "bg-background",
      className
    )}>
      {/* Main Content Area - NO bottom padding, let individual pages handle safe-area */}
      <main
        className={cn(
          "flex-1 bg-background"
        )}
        style={isMobile ? {
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        } : undefined}
      >
        {children}
      </main>

      {/* MobileBottomNav REMOVED - redundant with top navigation rows */}
    </div>
  );
};

