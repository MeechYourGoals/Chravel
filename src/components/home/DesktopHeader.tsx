import React from 'react';
import { DemoModeSelector } from '../DemoModeSelector';
import { HeaderAuthButton } from '../HeaderAuthButton';


import { useAuth } from '../../hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface DesktopHeaderProps {
  viewMode: string;
  onCreateTrip: () => void;
  onUpgrade: () => void;
  onSettings: (settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser', activeSection?: string) => void;
}

export const DesktopHeader = ({ viewMode }: DesktopHeaderProps) => {
  const blurbs: Record<string, string> = {
    myTrips: 'Plan your perfect trip.',
    tripsPro: 'Enterprise software for professional trip management.',
    events: 'Professional event management and coordination.',
    travelRecs: 'Discover curated hotels, dining, and experiences.',
  };
  const subtitle = blurbs[viewMode] ?? 'Plan your perfect trip.';

  return (
    <div className="mb-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Logo + Subtitle */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight transition-all duration-300 hover:brightness-110 hover:scale-105" aria-label="Chravel Home">
            Chravel
          </h1>
          <span className="text-sm text-muted-foreground hidden md:inline">
            {subtitle}
          </span>
        </div>
        
        {/* Right: Demo Selector + Auth Button */}
        <div className="flex items-center gap-2">
          <DemoModeSelector />
          <HeaderAuthButton />
        </div>
      </div>
    </div>
  );
};