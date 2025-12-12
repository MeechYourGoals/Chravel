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
  return (
    <div className="mb-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Logo */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-foreground tracking-tight transition-all duration-300 hover:brightness-110 hover:scale-105" aria-label="ChravelApp Home">
            ChravelApp
          </h1>
          <span className="text-xs text-muted-foreground">The Group Chat Travel App</span>
        </div>
        
        {/* Center: Demo Selector */}
        <div className="flex-1 flex justify-center">
          <DemoModeSelector />
        </div>
        
        {/* Right: Auth Button */}
        <div className="flex items-center">
          <HeaderAuthButton />
        </div>
      </div>
    </div>
  );
};