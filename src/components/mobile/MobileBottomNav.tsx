
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Compass, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'home',
      label: 'Trips',
      icon: Home,
      path: '/',
      isActive: location.pathname === '/'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search',
      isActive: location.pathname.includes('/search')
    },
    {
      id: 'recs',
      label: 'Recs',
      icon: Compass,
      path: '/recs',
      isActive: location.pathname.includes('/recs')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      isActive: location.pathname.includes('/settings')
    }
  ];

  const handleTabPress = async (tab: typeof tabs[0]) => {
    // Add haptic feedback
    await hapticService.light();
    navigate(tab.path);
  };

  return (
    <nav 
      className={cn(
        // Fixed positioning with safe area support
        "fixed bottom-0 left-0 right-0 z-50",
        // Safe area padding for iOS devices
        "pb-safe-area-bottom",
        // Background and borders
        "bg-background/95 backdrop-blur-md border-t border-border",
        // Shadow for elevation
        "shadow-mobile-nav",
        // Hide on desktop (900px+)
        "md:hidden",
        className
      )}
      style={{
        paddingBottom: `max(16px, env(safe-area-inset-bottom))`
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={cn(
                // Touch target and layout
                "flex flex-col items-center justify-center min-w-touch-target min-h-touch-target",
                "px-2 py-1 rounded-lg transition-all duration-200",
                // Active state
                tab.isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                // Touch feedback
                "active:scale-95 active:bg-muted/70"
              )}
            >
              <Icon 
                size={20} 
                className={cn(
                  "mb-1 transition-all duration-200",
                  tab.isActive ? "scale-110" : ""
                )}
              />
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                tab.isActive ? "text-primary" : ""
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
